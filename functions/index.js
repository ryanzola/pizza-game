const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");
const { GoogleGenAI } = require("@google/genai");
const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { onCall } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { defineSecret } = require("firebase-functions/params");

const googleApiKey = defineSecret("GOOGLE_API_KEY");
const geminiApiKey = defineSecret("GEMINI_API_KEY");

// Import the parsed residential addresses
const addressesData = require("./data/addresses.json");
const menuData = require("./data/menu.json");
const resourcesData = require("./data/resources.json");
// Fixed game locations, shared with the web client (services/web/src/store/location.js).
const POIS = require("./data/pois.json");

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
    // ZERO_RESULTS is a bad address; anything else (REQUEST_DENIED,
    // OVER_QUERY_LIMIT, ...) means the key/config is broken and every order
    // will silently land on the fallback coordinate — make that visible.
    const logFn = data.status === "ZERO_RESULTS" ? console.warn : console.error;
    logFn(`Geocoding failed for "${addressStr}": ${data.status}${data.error_message ? ` — ${data.error_message}` : ''}`);
    return null;
  } catch (error) {
    console.error("Error fetching geocoding data:", error.message);
    return null;
  }
};

// ---------------------------------------------------------------------------
// Delivery address selection
// ---------------------------------------------------------------------------
// Orders should form a plausible driving route: not on top of the pizzeria
// (an address inside the delivery radius would auto-complete the moment the
// driver pulls out), not absurdly far, and not stacked on top of each other.
const SPAWN_MIN_FROM_PIZZERIA_M = 400;
const SPAWN_MAX_FROM_PIZZERIA_M = 4000;
const SPAWN_MIN_SEPARATION_M = 200;
// Random draws per slot before we give up and take the best we saw.
const SPAWN_MAX_ATTEMPTS = 6;

// Geocoding is billed per call and the address list is static, so cache
// results in Firestore (and per-instance in memory).
const geocodeMemo = new Map();
const geocodeCacheRef = (addressStr) =>
  db.collection('geocache').doc(encodeURIComponent(addressStr.toLowerCase()));

const getLatLonCached = async (addressStr) => {
  if (geocodeMemo.has(addressStr)) return geocodeMemo.get(addressStr);
  try {
    const snap = await geocodeCacheRef(addressStr).get();
    if (snap.exists) {
      const { lat, lon } = snap.data();
      const coords = { lat, lon };
      geocodeMemo.set(addressStr, coords);
      return coords;
    }
  } catch (e) {
    console.warn('geocache read failed:', e.message);
  }
  const coords = await getLatLon(addressStr);
  if (coords) {
    geocodeMemo.set(addressStr, coords);
    geocodeCacheRef(addressStr).set({ ...coords, address: addressStr, cached_at: admin.firestore.FieldValue.serverTimestamp() })
      .catch((e) => console.warn('geocache write failed:', e.message));
  }
  return coords;
};

const distanceFromPizzeriaM = (lat, lon) =>
  haversineMeters(POIS.pizzeria.latitude, POIS.pizzeria.longitude, lat, lon);

/**
 * Pick one geocoded delivery address satisfying the spawn constraints, or
 * the least-bad candidate if none did. `taken` is a list of {lat, lon}
 * already used in this batch. Returns { addressObj, lat, lon } or null if
 * nothing could be geocoded at all.
 */
const pickDeliveryAddress = async (taken = []) => {
  let best = null;
  for (let attempt = 0; attempt < SPAWN_MAX_ATTEMPTS; attempt++) {
    const addressObj = getRandomAddress();
    const coords = await getLatLonCached(addressObj.fullAddress);
    if (!coords) continue;
    const { lat, lon } = coords;

    const fromPizzeria = distanceFromPizzeriaM(lat, lon);
    const tooClose = fromPizzeria < SPAWN_MIN_FROM_PIZZERIA_M;
    const tooFar = fromPizzeria > SPAWN_MAX_FROM_PIZZERIA_M;
    const crowded = taken.some((t) => haversineMeters(t.lat, t.lon, lat, lon) < SPAWN_MIN_SEPARATION_M);

    const candidate = { addressObj, lat, lon };
    if (!tooClose && !tooFar && !crowded) return candidate;
    // Never fall back to something inside the auto-deliver zone; anything
    // else is acceptable as a last resort.
    if (!tooClose && (best === null || (!crowded && best.crowded))) {
      best = { ...candidate, crowded };
    }
  }
  if (best) {
    console.warn(`pickDeliveryAddress: no ideal candidate after ${SPAWN_MAX_ATTEMPTS} attempts, using ${best.addressObj.fullAddress}`);
    return { addressObj: best.addressObj, lat: best.lat, lon: best.lon };
  }
  return null;
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

exports.generateOrder = onCall(
  { secrets: [geminiApiKey, googleApiKey] },
  async (request) => {
    // Ensure the user is authenticated via Firebase Auth
    if (!request.auth) {
      throw new Error('unauthenticated: You must be logged in to generate orders.');
    }

    try {
      // Provide a valid fallback if geocoding fails to prevent breaking the game
      const picked = (await pickDeliveryAddress()) ?? {
        addressObj: getRandomAddress(),
        lat: POIS.geocodeFallback.latitude,
        lon: POIS.geocodeFallback.longitude,
      };
      const { addressObj, lat, lon } = picked;

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

      // Pick addresses sequentially so each can be spaced from the previous
      // ones; the (slow) order-content generation then runs in parallel.
      const picks = [];
      for (let i = 0; i < batchSize; i++) {
        const picked = await pickDeliveryAddress(picks);
        if (picked) picks.push(picked);
      }
      if (picks.length === 0) {
        // Geocoder unavailable: keep the game playable with one fallback order.
        console.error(`generateOrderBatch: geocoding failed for all ${batchSize} slots; falling back to a single order at the fallback coordinate. Check GOOGLE_API_KEY has the Geocoding API enabled.`);
        picks.push({ addressObj: getRandomAddress(), lat: POIS.geocodeFallback.latitude, lon: POIS.geocodeFallback.longitude });
      } else if (picks.length < batchSize) {
        console.warn(`generateOrderBatch: only ${picks.length}/${batchSize} addresses geocoded.`);
      }

      const orderPromises = picks.map(({ addressObj, lat, lon }) => (async () => {
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

// ---------------------------------------------------------------------------
// Server-side delivery verification
// ---------------------------------------------------------------------------

// Drive-by delivery model: the player passes the house in a car and does not
// need to stop, so the radius is generous and padded by the reported GPS
// accuracy (capped so a wildly inaccurate fix can't reach across the street).
const DELIVERY_BASE_RADIUS_M = 100;
const DELIVERY_MAX_ACCURACY_PAD_M = 50;
// Largest radius the server will ever accept. The web client mirrors these
// numbers in services/web/src/store/location.js (BASE_RADIUS_M,
// MAX_ACCURACY_PAD_M, MAX_USABLE_ACCURACY_M) — keep them in sync.
const DELIVERY_MAX_RADIUS_M = DELIVERY_BASE_RADIUS_M + DELIVERY_MAX_ACCURACY_PAD_M;
// Fixes worse than this are too vague to prove the player was at the house.
const DELIVERY_MAX_ACCURACY_M = 150;
// Implied ground speed above this between two accepted fixes is treated as
// GPS spoofing / teleporting. 45 m/s ≈ 100 mph — well above street driving.
const MAX_PLAUSIBLE_SPEED_MPS = 45;
// Ignore the teleport check when the previous fix is older than this — the
// player may legitimately have driven far while the app was backgrounded.
const TELEPORT_CHECK_WINDOW_MS = 30 * 60 * 1000;
// Never divide by a tiny dt: two calls a few hundred ms apart would turn
// metres of GPS jitter into hundreds of m/s.
const TELEPORT_MIN_DT_SEC = 2;
// A fix rejected as a teleport is remembered; if the player keeps reporting a
// consistent position for this long we accept the new location. This lets a
// real player recover from one glitchy fix (~10 s) while forcing a spoofer to
// hold each faked position rather than hop instantly.
const TELEPORT_CONFIRM_MS = 10 * 1000;

const deg2rad = (deg) => deg * (Math.PI / 180);

const haversineMeters = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const isFiniteNumber = (v) => typeof v === 'number' && Number.isFinite(v);
const tsToMillis = (ts) => (ts && typeof ts.toMillis === 'function') ? ts.toMillis() : null;

// Is moving from `prev` to the current fix physically plausible? Distance is
// reduced by both fixes' accuracy so jitter inside the error circles doesn't
// count as movement. Unknown/stale/too-recent prev → plausible (no evidence).
const isPlausibleMove = (prev, fix, now) => {
  const prevAt = tsToMillis(prev?.at);
  if (!prevAt || !isFiniteNumber(prev.latitude) || !isFiniteNumber(prev.longitude)) return true;
  const dtSec = (now - prevAt) / 1000;
  if (dtSec < TELEPORT_MIN_DT_SEC || dtSec * 1000 > TELEPORT_CHECK_WINDOW_MS) return true;
  const raw = haversineMeters(prev.latitude, prev.longitude, fix.latitude, fix.longitude);
  const moved = Math.max(0, raw - (prev.accuracy ?? 0) - (fix.accuracy ?? 0));
  return moved / dtSec <= MAX_PLAUSIBLE_SPEED_MPS;
};

// Throws for anything that means "stop retrying" (not yours, wrong status).
const assertDeliverable = (orderSnap, uid) => {
  if (!orderSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Order not found.');
  }
  const order = orderSnap.data();
  if (order.user_id !== uid) {
    throw new functions.https.HttpsError('permission-denied', 'This order is not assigned to you.');
  }
  if (order.status === 'delivered') return order; // idempotent path, caller handles
  if (!['pending', 'en_route'].includes(order.status)) {
    throw new functions.https.HttpsError('failed-precondition', `Order cannot be delivered from status '${order.status}'.`);
  }
  if (!isFiniteNumber(order.latitude) || !isFiniteNumber(order.longitude)) {
    throw new functions.https.HttpsError('failed-precondition', 'Order has no delivery coordinates.');
  }
  return order;
};

/**
 * deliverOrder({ orderId, latitude, longitude, accuracy })
 *
 * The client reports its position; the server decides whether the order is
 * delivered. Clients are not allowed to set status 'delivered' directly (see
 * firestore.rules). The existing processOrderAchievements trigger still fires
 * on the status change and handles payouts/achievements.
 *
 * Returns { success: true, distance } or { success: false, reason, ... } for
 * "soft" rejections (too far, poor accuracy, implausible movement) so the
 * client can simply try again on its next GPS fix. Hard errors (bad args,
 * not your order, wrong status) throw HttpsError.
 *
 * The common "not there yet" case is answered with a single plain read and no
 * writes; the transaction only runs once the position is inside the radius.
 */
exports.deliverOrder = onCall(async (request) => {
  if (!request.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'You must be logged in to deliver orders.');
  }
  const uid = request.auth.uid;
  const { orderId, latitude, longitude, accuracy } = request.data || {};

  if (typeof orderId !== 'string' || !orderId) {
    throw new functions.https.HttpsError('invalid-argument', 'orderId is required.');
  }
  if (!isFiniteNumber(latitude) || !isFiniteNumber(longitude) ||
      latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    throw new functions.https.HttpsError('invalid-argument', 'A valid latitude/longitude is required.');
  }
  const acc = isFiniteNumber(accuracy) && accuracy >= 0 ? accuracy : null;
  const fix = { latitude, longitude, accuracy: acc };

  if (acc !== null && acc > DELIVERY_MAX_ACCURACY_M) {
    return { success: false, reason: 'poor_accuracy', accuracy: acc };
  }

  const orderRef = db.collection('orders').doc(orderId);
  const positionRef = db.collection('users').doc(uid).collection('telemetry').doc('last_position');
  const radius = DELIVERY_BASE_RADIUS_M + Math.min(acc ?? 0, DELIVERY_MAX_ACCURACY_PAD_M);

  try {
    // Cheap pre-check: no transaction, no writes, for the routine "still
    // driving up" case.
    const preOrder = assertDeliverable(await orderRef.get(), uid);
    if (preOrder.status === 'delivered') return { success: true, alreadyDelivered: true };
    const distance = haversineMeters(latitude, longitude, preOrder.latitude, preOrder.longitude);
    if (distance > radius) {
      return { success: false, reason: 'too_far', distance, radius };
    }

    return await db.runTransaction(async (tx) => {
      const [orderSnap, posSnap] = await Promise.all([tx.get(orderRef), tx.get(positionRef)]);
      const order = assertDeliverable(orderSnap, uid);
      if (order.status === 'delivered') return { success: true, alreadyDelivered: true };

      const now = Date.now();
      const telemetry = posSnap.exists ? posSnap.data() : {};

      // Teleport / spoof check against the last accepted position.
      if (!isPlausibleMove(telemetry, fix, now)) {
        // Consistent with a previously rejected fix for long enough? Then the
        // earlier accepted fix was the glitch — accept the new location.
        const rejected = telemetry.rejected;
        const rejectedAt = tsToMillis(rejected?.at);
        const confirmed = rejected && rejectedAt &&
          now - rejectedAt >= TELEPORT_CONFIRM_MS &&
          isPlausibleMove(rejected, fix, now);
        if (!confirmed) {
          console.warn(`deliverOrder: implausible movement for ${uid}; awaiting confirmation`);
          // Only start the confirmation clock if there is no pending rejected
          // fix that this one is consistent with (keep the earliest timestamp).
          if (!rejected || !isPlausibleMove(rejected, fix, now)) {
            tx.set(positionRef, {
              rejected: { ...fix, at: admin.firestore.FieldValue.serverTimestamp() }
            }, { merge: true });
          }
          return { success: false, reason: 'implausible_movement' };
        }
      }

      tx.set(positionRef, {
        ...fix,
        at: admin.firestore.FieldValue.serverTimestamp(),
        rejected: admin.firestore.FieldValue.delete()
      }, { merge: true });

      tx.update(orderRef, {
        status: 'delivered',
        date_delivered: admin.firestore.FieldValue.serverTimestamp(),
        delivered_at: fix
      });

      return { success: true, distance };
    });
  } catch (error) {
    if (error instanceof functions.https.HttpsError) throw error;
    console.error('deliverOrder failed:', error);
    throw new functions.https.HttpsError('internal', 'Failed to deliver order.');
  }
});

// ---------------------------------------------------------------------------
// Bank deposits
// ---------------------------------------------------------------------------
/**
 * depositBank({ latitude, longitude, accuracy })
 *
 * Moves the player's carried cash (bank_amount) into savings_amount. Only the
 * server may change balances (see firestore.rules); the client sends its
 * position and we check it against the bank POI with the same padded radius
 * used for deliveries.
 *
 * Returns { success: true, deposited, bank_amount, savings_amount } or
 * { success: false, reason: 'too_far' | 'poor_accuracy' | 'nothing_to_deposit' }.
 */
exports.depositBank = onCall(async (request) => {
  if (!request.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'You must be logged in.');
  }
  const uid = request.auth.uid;
  const { latitude, longitude, accuracy } = request.data || {};

  if (!isFiniteNumber(latitude) || !isFiniteNumber(longitude) ||
      latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    throw new functions.https.HttpsError('invalid-argument', 'A valid latitude/longitude is required.');
  }
  const acc = isFiniteNumber(accuracy) && accuracy >= 0 ? accuracy : null;
  if (acc !== null && acc > DELIVERY_MAX_ACCURACY_M) {
    return { success: false, reason: 'poor_accuracy', accuracy: acc };
  }

  const distance = haversineMeters(latitude, longitude, POIS.bank.latitude, POIS.bank.longitude);
  const radius = DELIVERY_BASE_RADIUS_M + Math.min(acc ?? 0, DELIVERY_MAX_ACCURACY_PAD_M);
  if (distance > radius) {
    return { success: false, reason: 'too_far', distance, radius };
  }

  const userRef = db.collection('users').doc(uid);
  try {
    return await db.runTransaction(async (tx) => {
      const snap = await tx.get(userRef);
      const data = snap.exists ? snap.data() : {};
      const bank = Number(data.bank_amount) || 0;
      const savings = Number(data.savings_amount) || 0;
      if (bank <= 0) {
        return { success: false, reason: 'nothing_to_deposit', bank_amount: bank, savings_amount: savings };
      }
      const newSavings = parseFloat((savings + bank).toFixed(2));
      tx.set(userRef, {
        bank_amount: 0,
        savings_amount: newSavings,
        last_deposit: { amount: bank, at: admin.firestore.FieldValue.serverTimestamp() }
      }, { merge: true });
      return { success: true, deposited: bank, bank_amount: 0, savings_amount: newSavings };
    });
  } catch (error) {
    console.error('depositBank failed:', error);
    throw new functions.https.HttpsError('internal', 'Failed to deposit.');
  }
});

// ---------------------------------------------------------------------------
// Order expiry
// ---------------------------------------------------------------------------
// An order the driver holds too long is cancelled. The allowance grows with
// the number of orders they're juggling (mirrors the client's wait-time
// display in services/web/src/store/orders.js). Expiry is decided here, not
// on the phone: the client's timers stop when the PWA is backgrounded, and
// clients can't write order status directly (see firestore.rules).
const ORDER_BASE_WAIT_MS = 30 * 60 * 1000;
const ORDER_EXTRA_WAIT_MULTIPLIER = 1.1;
const ORDER_EXTRA_WAIT_THRESHOLD = 6;

const cancellationWindowMs = (activeCount) => {
  const extra = activeCount > ORDER_EXTRA_WAIT_THRESHOLD
    ? ORDER_BASE_WAIT_MS * (activeCount - ORDER_EXTRA_WAIT_THRESHOLD) * ORDER_EXTRA_WAIT_MULTIPLIER
    : 0;
  return ORDER_BASE_WAIT_MS + extra + ORDER_BASE_WAIT_MS;
};

// Cancel expired orders among `orders` (docs for ONE user, all active).
// Returns the ids cancelled.
const expireUserOrders = async (uid, orderDocs, now) => {
  const window = cancellationWindowMs(orderDocs.length);
  const expired = orderDocs.filter((d) => {
    const placed = tsToMillis(d.get('date_placed'));
    return placed !== null && now - placed > window;
  });
  if (expired.length === 0) return [];

  const batch = db.batch();
  for (const d of expired) {
    batch.update(d.ref, {
      status: 'cancelled',
      cancelled_at: admin.firestore.FieldValue.serverTimestamp(),
      cancel_reason: 'expired'
    });
  }
  await batch.commit();
  console.log(`Expired ${expired.length} order(s) for ${uid}`);
  return expired.map((d) => d.id);
};

const activeOrdersQuery = () =>
  db.collection('orders').where('status', 'in', ['pending', 'en_route']);

/**
 * expireOrders() — called by the client on a timer / on resume so expiry
 * shows up promptly. Only touches the caller's own orders.
 * Returns { cancelled: [orderId, ...] }.
 */
exports.expireOrders = onCall(async (request) => {
  if (!request.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'You must be logged in.');
  }
  const uid = request.auth.uid;
  try {
    const snap = await activeOrdersQuery().where('user_id', '==', uid).get();
    const cancelled = await expireUserOrders(uid, snap.docs, Date.now());
    return { cancelled };
  } catch (error) {
    console.error('expireOrders failed:', error);
    throw new functions.https.HttpsError('internal', 'Failed to expire orders.');
  }
});

/**
 * Safety net for phones that are asleep / offline: sweep every user's active
 * orders on a schedule.
 */
exports.sweepExpiredOrders = onSchedule('every 10 minutes', async () => {
  const snap = await activeOrdersQuery().get();
  const byUser = new Map();
  for (const d of snap.docs) {
    const uid = d.get('user_id');
    if (!uid) continue; // queued/unclaimed orders never expire here
    if (!byUser.has(uid)) byUser.set(uid, []);
    byUser.get(uid).push(d);
  }
  const now = Date.now();
  let total = 0;
  for (const [uid, docs] of byUser) {
    try {
      total += (await expireUserOrders(uid, docs, now)).length;
    } catch (error) {
      console.error(`sweepExpiredOrders failed for ${uid}:`, error);
    }
  }
  console.log(`sweepExpiredOrders: cancelled ${total} order(s) across ${byUser.size} user(s)`);
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

        // Distance covered: straight-line pizzeria -> drop-off (a proxy; the
        // client doesn't report a track). Uses the real pizzeria location and
        // great-circle distance.
        if (isFiniteNumber(orderAfter.latitude) && isFiniteNumber(orderAfter.longitude)) {
          const distKm = haversineMeters(
            POIS.pizzeria.latitude, POIS.pizzeria.longitude,
            orderAfter.latitude, orderAfter.longitude
          ) / 1000;
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

        if (!pizzeriaDoc.exists) {
          transaction.set(pizzeriaRef, {
            bank_balance: 1000 + revenue,
            level: 1,
            total_lifetime_deliveries: 1
          });
        } else {
          const currentData = pizzeriaDoc.data();
          const currentLevel = currentData.level || 1;
          const newDeliveryCount = (currentData.total_lifetime_deliveries || 0) + 1;
          const newLevelInfo = getLevelInfo(newDeliveryCount);

          const updateData = {
            bank_balance: admin.firestore.FieldValue.increment(revenue),
            total_lifetime_deliveries: admin.firestore.FieldValue.increment(1)
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
