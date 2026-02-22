import RestaurantPosConnection from '../models/restaurantPosConnection.model.js';
import FoodPosMap from '../models/foodPosMap.model.js';
import PlatformPrice from '../models/platformPrice.model.js';
import { getPosService } from '../services/pos/index.js';

export const syncPosPrices = async () => {
    console.log('Starting POS Price Sync...');
    try {
        const connections = await RestaurantPosConnection.find({ isConnected: true }).select('+apiKey');

        for (const conn of connections) {
            try {
                const service = getPosService(conn.posProvider);
                if (!service) {
                    console.warn(`Service not found for provider: ${conn.posProvider}`);
                    continue;
                }

                // Fetch menu from POS
                const menu = await service.fetchMenu({ apiKey: conn.apiKey });

                // Create lookup map: posItemId -> price
                const priceMap = new Map();
                if (Array.isArray(menu)) {
                    menu.forEach(item => priceMap.set(String(item.posItemId), Number(item.basePrice)));
                }

                // Get all mapped items for this restaurant
                const mappings = await FoodPosMap.find({ restaurant: conn.restaurant });

                let updatedCount = 0;
                for (const map of mappings) {
                    const newPrice = priceMap.get(String(map.posItemId));

                    if (newPrice !== undefined && !isNaN(newPrice)) {
                        // Update ALL platform prices for this food item to the POS price
                        // This assumes the POS price applies to all platforms (Zomato/Swiggy)
                        // In a real app, logic might be more complex (markups, specific platform prices)
                        const result = await PlatformPrice.updateMany(
                            { food: map.food },
                            {
                                price: newPrice,
                                source: 'POS'
                            }
                        );
                        updatedCount += result.modifiedCount;
                    }
                }
                console.log(`Synced ${updatedCount} prices for restaurant ${conn.restaurant}`);

            } catch (err) {
                console.error(`Sync failed for restaurant ${conn.restaurant}:`, err.message);
            }
        }
    } catch (error) {
        console.error('Job Execution Error:', error);
    }
    console.log('POS Price Sync Completed.');
};
