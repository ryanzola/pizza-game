const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");
const { OpenAI } = require("openai");
const { onDocumentUpdated } = require("firebase-functions/v2/firestore");

// Import the parsed residential addresses
const addressesData = require("./data/addresses.json");

admin.initializeApp();
const db = admin.firestore();

// Initialize OpenAI client
// We expect OPENAI_API_KEY and GOOGLE_API_KEY to be set in Firebase functions config
// e.g., firebase functions:secrets:set OPENAI_API_KEY
// Assistant setup variables
const ASSISTANT_ID = process.env.OPENAI_ASSISTANT_ID;

// Helper to get random item from array
const getRandomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Helper to pick a random residential address
const getRandomAddress = () => {
  const towns = Object.keys(addressesData);
  const randomTown = getRandomElement(towns);

  const streetsInTown = Object.keys(addressesData[randomTown]);
  const randomStreet = getRandomElement(streetsInTown);

  const numbersOnStreet = addressesData[randomTown][randomStreet];
  const randomNumber = getRandomElement(numbersOnStreet);

  return {
    number: randomNumber,
    street: randomStreet,
    town: randomTown,
    fullAddress: `${randomNumber} ${randomStreet}, ${randomTown.replace('_', ' ')}, NJ`
  };
};

const getLatLon = async (addressStr) => {
  const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
  if (!GOOGLE_API_KEY) {
    console.warn("Missing GOOGLE_API_KEY, skipping geocoding for now.");
    return null;
  }

  const formattedAddress = encodeURIComponent(addressStr);
  const googleUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${formattedAddress}&key=${GOOGLE_API_KEY}`;

  try {
    const response = await axios.get(googleUrl, { timeout: 10000 });
    const data = response.data;

    if (data.status === "OK") {
      const lat = data.results[0].geometry.location.lat;
      const lon = data.results[0].geometry.location.lng;
      return { lat, lon };
    }
    return null;
  } catch (error) {
    console.error("Error fetching geocoding data:", error.message);
    return null;
  }
};

const estimatedOrderCost = (familySize) => {
  const costPerPerson = Math.random() * (15 - 5) + 5;
  const costVariance = Math.random() * (1.2 - 0.8) + 0.8;
  const total = costPerPerson * familySize * costVariance;

  const tipPercentage = 0.10;
  const generosityVariance = Math.random() * (1.2 - 0.8) + 0.8;
  const tip = total * tipPercentage * generosityVariance;

  return {
    total: parseFloat(total.toFixed(2)),
    tip: parseFloat(tip.toFixed(2))
  };
};

const getRandomOrderFromOpenAI = async (familySize) => {
  try {
    // Wait for the assistant ID to ensure we are using the correct one
    if (!ASSISTANT_ID) {
      console.warn("No Assistant ID configured, falling back to a dummy order.");
      return null;
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || functions.config().openai?.key,
    });

    const thread = await openai.beta.threads.create();

    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: `Please create an order for a family of ${familySize} people.`
    });

    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: ASSISTANT_ID
    });

    // Poll for completion
    let runStatus;
    let attempts = 0;
    while (attempts < 30) {
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      if (runStatus.status === 'completed' || runStatus.status === 'failed') {
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }

    if (runStatus.status === 'completed') {
      const messages = await openai.beta.threads.messages.list(thread.id);
      const assistantMessages = messages.data.filter(msg => msg.role === 'assistant');
      if (assistantMessages.length > 0) {
        const responseText = assistantMessages[0].content[0].text.value;
        return JSON.parse(responseText);
      }
    }
    return null;
  } catch (error) {
    console.error("OpenAI generation failed:", error);
    return null;
  }
};

exports.generateOrder = functions.https.onCall(async (request) => {
  console.log("Context auth:", request.auth);
  // Ensure the user is authenticated via Firebase Auth
  if (!request.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be logged in to generate orders.'
    );
  }

  try {
    const addressObj = getRandomAddress();
    const coords = await getLatLon(addressObj.fullAddress);

    // Provide a valid fallback if geocoding fails to prevent breaking the game
    const lat = coords ? coords.lat : 40.8262;
    const lon = coords ? coords.lon : -74.0660;

    const familySize = Math.floor(Math.random() * 6) + 1;
    let orderDetails = await getRandomOrderFromOpenAI(familySize);

    if (!orderDetails) {
      // Fallback order if OpenAI fails
      orderDetails = {
        order_items: [
          `${familySize} large cheese pizza${familySize > 1 ? 's' : ''}`,
          "1 garlic knots"
        ]
      };
    }

    const { total, tip } = estimatedOrderCost(familySize);

    // Roll for VIP order (15% chance)
    const isVip = Math.random() < 0.15;
    const finalTip = isVip ? parseFloat((tip * 3).toFixed(2)) : tip;

    const newOrder = {
      status: 'queued',
      is_vip: isVip,
      date_placed: admin.firestore.FieldValue.serverTimestamp(),
      date_delivered: null,
      user_id: null,
      address: {
        street: addressObj.street,
        town: addressObj.town.replace('_', ' '),
        number: addressObj.number.toString(),
        full_address: addressObj.fullAddress
      },
      items: orderDetails.order_items,
      total_cost: total,
      tip: finalTip,
      latitude: lat,
      longitude: lon
    };

    // Save strictly to Firestore bypassing the client
    const docRef = await db.collection("orders").add(newOrder);

    // Send Push Notification for VIP Orders
    if (isVip) {
      try {
        const tokensSnapshot = await db.collectionGroup('tokens').get();
        const tokens = tokensSnapshot.docs.map(d => d.data().token);

        if (tokens.length > 0) {
          const message = {
            notification: {
              title: '💎 VIP Order Alert!',
              body: `A massive VIP pizza order was just placed nearby. Big tip guaranteed!`
            },
            tokens: tokens
          };
          // Try both methods for SDK version compatibility
          if (admin.messaging().sendEachForMulticast) {
            await admin.messaging().sendEachForMulticast(message);
          } else {
            await admin.messaging().sendMulticast(message);
          }
          console.log(`Sent VIP push notification to ${tokens.length} devices.`);
        }
      } catch (pushError) {
        console.error('Error sending VIP push notification:', pushError);
      }
    }

    return {
      success: true,
      orderId: docRef.id,
      order: newOrder
    };

  } catch (error) {
    console.error("Error generating order:", error);
    throw new functions.https.HttpsError('internal', 'Failed to generate order.');
  }
});

// Background function to process delivered orders and award achievements
exports.processOrderAchievements = onDocumentUpdated("orders/{orderId}", async (event) => {
  const orderBefore = event.data.before.data();
  const orderAfter = event.data.after.data();

  // Only process when an order transitions to 'delivered' status
  if (orderBefore.status !== 'delivered' && orderAfter.status === 'delivered') {
    const userId = orderAfter.user_id;
    if (!userId) return;

    try {
      // We process achievements and stats in a transaction to ensure consistency
      await db.runTransaction(async (transaction) => {
        // 1. Get User's Lifetime Stats
        const statsRef = db.collection('users').doc(userId).collection('stats').doc('lifetime');
        const statsDoc = await transaction.get(statsRef);

        // Initialize default stats if they don't exist yet
        let stats = statsDoc.exists ? statsDoc.data() : {
          total_deliveries: 0,
          total_distance_km: 0,
          unique_streets: [],
          total_tips: 0
        };

        // 2. Increment Stats
        stats.total_deliveries += 1;
        stats.total_tips += (orderAfter.tip || 0);

        // Calculate distance
        if (orderAfter.latitude && orderAfter.longitude) {
          // Pizzeria location approx
          const pixLat = 40.8262;
          const pixLon = -74.0660;

          const latDiff = pixLat - orderAfter.latitude;
          const lonDiff = pixLon - orderAfter.longitude;

          // Approx conversion: 1 degree ~ 111 km
          const distKm = Math.sqrt(Math.pow(latDiff, 2) + Math.pow(lonDiff, 2)) * 111;
          stats.total_distance_km += distKm;
        }

        const street = orderAfter.address?.street;
        if (street && !stats.unique_streets.includes(street)) {
          stats.unique_streets.push(street);
        }

        // 3. Write Stats Back
        transaction.set(statsRef, stats, { merge: true });

        // 4. Check & Award Achievements
        const achievementsRef = db.collection('users').doc(userId).collection('achievements');
        const unlockedDocs = await transaction.get(achievementsRef);
        const unlockedIds = unlockedDocs.docs.map(d => d.id);

        let newAchievements = [];

        // Check: First Slice
        if (stats.total_deliveries === 1 && !unlockedIds.includes('first_slice')) {
          newAchievements.push({
            id: 'first_slice',
            title: 'First Slice',
            description: 'Complete your very first delivery.',
            icon: '🍕'
          });
        }

        // Check: Pizza Tycoon
        if (stats.total_deliveries >= 100 && !unlockedIds.includes('pizza_tycoon')) {
          newAchievements.push({
            id: 'pizza_tycoon',
            title: 'Pizza Tycoon',
            description: 'Complete 100 total deliveries.',
            icon: '👑'
          });
        }

        // Check: Speed Demon
        if (!unlockedIds.includes('speed_demon')) {
          if (orderAfter.date_placed && orderAfter.date_delivered) {
            const placedTime = orderAfter.date_placed.toMillis ? orderAfter.date_placed.toMillis() : new Date(orderAfter.date_placed).getTime();
            const deliveryTime = orderAfter.date_delivered.toMillis ? orderAfter.date_delivered.toMillis() : new Date(orderAfter.date_delivered).getTime();
            const diffMinutes = (deliveryTime - placedTime) / (1000 * 60);

            if (diffMinutes <= 5) {
              newAchievements.push({
                id: 'speed_demon',
                title: 'Speed Demon',
                description: 'Complete a delivery within 5 minutes of picking it up.',
                icon: '⚡'
              });
            }
          }
        }

        // Write any newly unlocked achievements
        for (const achievement of newAchievements) {
          const docRef = achievementsRef.doc(achievement.id);
          transaction.set(docRef, {
            ...achievement,
            unlocked_at: admin.firestore.FieldValue.serverTimestamp()
          });
          console.log(`Unlocked achievement ${achievement.id} for user ${userId}`);
        }
      });

    } catch (error) {
      console.error("Error processing achievements:", error);
    }
  }
});
