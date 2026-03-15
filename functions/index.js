const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");
const { GoogleGenAI } = require("@google/genai");
const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { onCall } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");

const googleApiKey = defineSecret("GOOGLE_API_KEY");
const geminiApiKey = defineSecret("GEMINI_API_KEY");

// Import the parsed residential addresses
const addressesData = require("./data/addresses.json");
const menuData = require("./data/menu.json");
const resourcesData = require("./data/resources.json");

// Classify order items into resource categories using keyword matching
const classifyOrderResources = (orderItems) => {
  const deductions = {};
  const resources = resourcesData.resources;

  for (const item of orderItems) {
    const itemLower = item.toLowerCase();
    for (const [resourceKey, resourceDef] of Object.entries(resources)) {
      const matched = resourceDef.keywords.some(kw => itemLower.includes(kw));
      if (matched) {
        deductions[resourceKey] = (deductions[resourceKey] || 0) + 1;
      }
    }
  }

  return deductions;
};

// Get the current level and multiplier from delivery count
const getLevelInfo = (totalDeliveries) => {
  const thresholds = resourcesData.level_thresholds;
  let currentLevel = thresholds[0];
  for (const threshold of thresholds) {
    if (totalDeliveries >= threshold.deliveries) {
      currentLevel = threshold;
    } else {
      break;
    }
  }
  return currentLevel;
};

// Calculate scaled max for a resource at a given level
const getScaledMax = (baseMax, multiplier) => {
  return Math.floor(baseMax * multiplier);
};

admin.initializeApp();
const db = admin.firestore();

// Initialize OpenAI client
// We expect OPENAI_API_KEY and GOOGLE_API_KEY to be set in Firebase functions config
// e.g., firebase functions:secrets:set OPENAI_API_KEY
// Assistant setup variables
// Assistant setup variables
// Secrets are injected via defineSecret and accessed via .value() inside the function.

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
  const GOOGLE_API_KEY = googleApiKey.value();
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

const getRandomOrderFromGemini = async (familySize) => {
  try {
    const apiKey = geminiApiKey.value();
    if (!apiKey) {
      console.warn("No Gemini API Key configured, falling back to a dummy order.");
      return null;
    }

    const ai = new GoogleGenAI({ apiKey: apiKey });

    const prompt = `
    You are an order placement bot for a pizzeria.
    Generate a realistic pizza order for a family of ${familySize} people.
    Choose random, realistic combinations of food items strictly from the following menu data. Do not make up items or prices.
    
    Menu: ${JSON.stringify(menuData)}
    
    Return the order strictly as a valid JSON object matching this exact format, with no markdown formatting or extra text:
    {
      "order_items": ["2 14\\" Cheese Pizzas", "1 Garlic Knots", "1 2 Liter Soda Coke"]
    }
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    if (response.text) {
      return JSON.parse(response.text);
    }

    return null;
  } catch (error) {
    console.error("Gemini generation failed:", error);
    return null;
  }
};

const functionsV1 = require("firebase-functions/v1");

exports.generateOrder = onCall(
  { secrets: [geminiApiKey, googleApiKey] },
  async (request) => {
    // Ensure the user is authenticated via Firebase Auth
    if (!request.auth) {
      throw new Error('unauthenticated: You must be logged in to generate orders.');
    }

    try {
      const addressObj = getRandomAddress();
      const coords = await getLatLon(addressObj.fullAddress);

      // Provide a valid fallback if geocoding fails to prevent breaking the game
      const lat = coords ? coords.lat : 40.8262;
      const lon = coords ? coords.lon : -74.0660;

      const familySize = Math.floor(Math.random() * 6) + 1;
      let orderDetails = await getRandomOrderFromGemini(familySize);

      if (!orderDetails) {
        // Fallback order if Gemini fails
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

// Batch order generation: creates 5-10 orders at once when the driver arrives at the pizzeria
exports.generateOrderBatch = onCall(
  { secrets: [geminiApiKey, googleApiKey] },
  async (request) => {
    if (!request.auth) {
      throw new Error('unauthenticated: You must be logged in to generate orders.');
    }

    try {
      // Check inventory before generating orders
      const inventoryRef = db.collection('pizzeria').doc('inventory');
      const inventorySnap = await inventoryRef.get();

      if (inventorySnap.exists) {
        const inv = inventorySnap.data();
        const depleted = [];
        for (const [key, def] of Object.entries(resourcesData.resources)) {
          if (inv[key] && inv[key].current <= 0) {
            depleted.push(key);
          }
        }
        if (depleted.length > 0) {
          return { success: false, reason: 'out_of_stock', depleted };
        }
      }

      const batchSize = Math.floor(Math.random() * 6) + 5; // 5–10 orders
      const orderPromises = [];

      for (let i = 0; i < batchSize; i++) {
        orderPromises.push((async () => {
          const addressObj = getRandomAddress();
          const coords = await getLatLon(addressObj.fullAddress);

          const lat = coords ? coords.lat : 40.8262;
          const lon = coords ? coords.lon : -74.0660;

          const familySize = Math.floor(Math.random() * 6) + 1;
          let orderDetails = await getRandomOrderFromGemini(familySize);

          if (!orderDetails) {
            orderDetails = {
              order_items: [
                `${familySize} large cheese pizza${familySize > 1 ? 's' : ''}`,
                "1 garlic knots"
              ]
            };
          }

          const { total, tip } = estimatedOrderCost(familySize);
          const isVip = Math.random() < 0.15;
          const finalTip = isVip ? parseFloat((tip * 3).toFixed(2)) : tip;

          return {
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
        })());
      }

      const orders = await Promise.all(orderPromises);

      // Deduct resources from inventory based on order items
      const totalDeductions = {};
      for (const order of orders) {
        const deductions = classifyOrderResources(order.items);
        for (const [key, amount] of Object.entries(deductions)) {
          totalDeductions[key] = (totalDeductions[key] || 0) + amount;
        }
      }

      // Write orders and deduct inventory in a transaction
      const orderIds = [];
      await db.runTransaction(async (transaction) => {
        const invSnap = await transaction.get(inventoryRef);
        const inv = invSnap.exists ? invSnap.data() : {};

        // Apply deductions (floor at 0)
        const updates = {};
        for (const [key, amount] of Object.entries(totalDeductions)) {
          if (inv[key]) {
            updates[`${key}.current`] = Math.max(0, (inv[key].current || 0) - amount);
          }
        }

        if (Object.keys(updates).length > 0) {
          transaction.update(inventoryRef, updates);
        }

        // Write orders
        for (const order of orders) {
          const docRef = db.collection("orders").doc();
          transaction.set(docRef, order);
          orderIds.push(docRef.id);
        }
      });

      // Send push notifications for any VIP orders in the batch
      const vipOrders = orders.filter(o => o.is_vip);
      if (vipOrders.length > 0) {
        try {
          const tokensSnapshot = await db.collectionGroup('tokens').get();
          const tokens = tokensSnapshot.docs.map(d => d.data().token);

          if (tokens.length > 0) {
            const message = {
              notification: {
                title: '💎 VIP Order Alert!',
                body: `${vipOrders.length} VIP order${vipOrders.length > 1 ? 's' : ''} just dropped! Big tips guaranteed!`
              },
              tokens: tokens
            };
            if (admin.messaging().sendEachForMulticast) {
              await admin.messaging().sendEachForMulticast(message);
            } else {
              await admin.messaging().sendMulticast(message);
            }
          }
        } catch (pushError) {
          console.error('Error sending VIP push notification:', pushError);
        }
      }

      return {
        success: true,
        count: orders.length,
        orderIds: orderIds
      };

    } catch (error) {
      console.error("Error generating order batch:", error);
      throw new functions.https.HttpsError('internal', 'Failed to generate order batch.');
    }
  });

// Background function to process delivered orders and award achievements
exports.processOrderAchievements = onDocumentUpdated("orders/{orderId}", async (event) => {
  const orderBefore = event.data.before.data();
  const orderAfter = event.data.after.data();

  // Only process when an order transitions to 'delivered' status
  if (orderBefore.status !== 'delivered' && orderAfter.status === 'delivered') {
    const userId = orderAfter.user_id;
    console.log(`Processing delivered order ${event.data.after.id} for user ${userId}`);
    if (!userId) {
      console.warn("No user_id found on the delivered order, skipping achievements and tips");
      return;
    }

    try {
      // We process achievements and stats in a transaction to ensure consistency
      await db.runTransaction(async (transaction) => {
        // 1. Define Refs & Perform All Reads First
        const statsRef = db.collection('users').doc(userId).collection('stats').doc('lifetime');
        const userRef = db.collection('users').doc(userId);
        const pizzeriaRef = db.collection('pizzeria').doc('finances');
        const achievementsRef = db.collection('users').doc(userId).collection('achievements');

        const [statsDoc, pizzeriaDoc, unlockedDocs] = await Promise.all([
          transaction.get(statsRef),
          transaction.get(pizzeriaRef),
          transaction.get(achievementsRef)
        ]);

        // 2. Process User's Lifetime Stats
        let stats = statsDoc.exists ? statsDoc.data() : {
          total_deliveries: 0,
          total_distance_km: 0,
          unique_streets: [],
          total_tips: 0
        };

        stats.total_deliveries += 1;
        stats.total_tips += (orderAfter.tip || 0);

        // Calculate distance
        if (orderAfter.latitude && orderAfter.longitude) {
          const pixLat = 40.8262;
          const pixLon = -74.0660;

          const latDiff = pixLat - orderAfter.latitude;
          const lonDiff = pixLon - orderAfter.longitude;

          const distKm = Math.sqrt(Math.pow(latDiff, 2) + Math.pow(lonDiff, 2)) * 111;
          stats.total_distance_km += distKm;
        }

        const street = orderAfter.address?.street;
        if (street && !stats.unique_streets.includes(street)) {
          stats.unique_streets.push(street);
        }

        // 3. Write Stats Back & Update User Bank
        transaction.set(statsRef, stats, { merge: true });

        transaction.set(userRef, {
          bank_amount: admin.firestore.FieldValue.increment(orderAfter.tip || 0)
        }, { merge: true });

        // Update Pizzeria Finances + Level Check
        const revenue = orderAfter.total_cost || 0;
        const newLevelInfo = getLevelInfo(stats.total_deliveries);

        if (!pizzeriaDoc.exists) {
          transaction.set(pizzeriaRef, {
            bank_balance: 1000 + revenue,
            level: newLevelInfo.level,
            total_lifetime_deliveries: stats.total_deliveries
          });
        } else {
          const currentData = pizzeriaDoc.data();
          const currentLevel = currentData.level || 1;
          const updateData = {
            bank_balance: admin.firestore.FieldValue.increment(revenue),
            total_lifetime_deliveries: stats.total_deliveries
          };

          // Level up! Scale max capacity for all resources
          if (newLevelInfo.level > currentLevel) {
            updateData.level = newLevelInfo.level;
            console.log(`Pizzeria leveled up to ${newLevelInfo.level}! Multiplier: ${newLevelInfo.multiplier}x`);

            // Scale inventory max values
            const inventoryRef = db.collection('pizzeria').doc('inventory');
            const invSnap = await transaction.get(inventoryRef);
            if (invSnap.exists) {
              const invData = invSnap.data();
              const invUpdates = {};
              for (const [key, def] of Object.entries(resourcesData.resources)) {
                if (invData[key]) {
                  invUpdates[`${key}.max`] = getScaledMax(def.base_max, newLevelInfo.multiplier);
                }
              }
              transaction.update(inventoryRef, invUpdates);
            }
          }

          transaction.set(pizzeriaRef, updateData, { merge: true });
        }

        // 4. Check & Award Achievements
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

// Restock inventory at depot or bakery
exports.restockInventory = onCall(async (request) => {
  if (!request.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'You must be logged in to restock.');
  }

  const { items, source } = request.data;

  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new functions.https.HttpsError('invalid-argument', 'Items array is required.');
  }

  if (!['depot', 'bakery'].includes(source)) {
    throw new functions.https.HttpsError('invalid-argument', 'Source must be depot or bakery.');
  }

  // Validate all items match the source location
  for (const item of items) {
    const resourceDef = resourcesData.resources[item.resource];
    if (!resourceDef) {
      throw new functions.https.HttpsError('invalid-argument', `Unknown resource: ${item.resource}`);
    }
    if (resourceDef.restock_location !== source) {
      throw new functions.https.HttpsError('invalid-argument', `${item.resource} cannot be restocked at ${source}. Must be restocked at ${resourceDef.restock_location}.`);
    }
  }

  try {
    const result = await db.runTransaction(async (transaction) => {
      const financesRef = db.collection('pizzeria').doc('finances');
      const inventoryRef = db.collection('pizzeria').doc('inventory');

      const [financesSnap, inventorySnap] = await Promise.all([
        transaction.get(financesRef),
        transaction.get(inventoryRef)
      ]);

      const finances = financesSnap.exists ? financesSnap.data() : { bank_balance: 0 };
      const inventory = inventorySnap.exists ? inventorySnap.data() : {};

      // Calculate total cost
      let totalCost = 0;
      const restockUpdates = {};

      for (const item of items) {
        const resourceDef = resourcesData.resources[item.resource];
        const currentData = inventory[item.resource] || { current: 0, max: resourceDef.base_max };
        const deficit = Math.max(0, currentData.max - currentData.current);
        const quantityToRestock = Math.min(item.quantity || deficit, deficit);
        const cost = quantityToRestock * resourceDef.restock_cost_per_unit;

        totalCost += cost;
        restockUpdates[`${item.resource}.current`] = currentData.current + quantityToRestock;
      }

      totalCost = parseFloat(totalCost.toFixed(2));

      // Check if pizzeria can afford it
      if (finances.bank_balance < totalCost) {
        throw new functions.https.HttpsError('failed-precondition', `Insufficient funds. Need $${totalCost.toFixed(2)} but only have $${finances.bank_balance.toFixed(2)}.`);
      }

      // Apply updates
      restockUpdates.last_restocked = admin.firestore.FieldValue.serverTimestamp();
      transaction.update(inventoryRef, restockUpdates);
      transaction.update(financesRef, {
        bank_balance: admin.firestore.FieldValue.increment(-totalCost)
      });

      return {
        success: true,
        total_cost: totalCost,
        new_balance: parseFloat((finances.bank_balance - totalCost).toFixed(2))
      };
    });

    return result;
  } catch (error) {
    if (error instanceof functions.https.HttpsError) throw error;
    console.error('Error restocking inventory:', error);
    throw new functions.https.HttpsError('internal', 'Failed to restock inventory.');
  }
});
