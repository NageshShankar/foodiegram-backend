export const fetchMenu = async (credentials) => {
    // Mock API call
    console.log("Fetching Petpooja menu with credentials...", credentials?.apiKey ? "Key Present" : "No Key");

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    return [
        { posItemId: "PP-101", name: "Butter Chicken", basePrice: 350 },
        { posItemId: "PP-102", name: "Butter Naan", basePrice: 45 },
        { posItemId: "PP-103", name: "Paneer Tikka", basePrice: 280 },
        { posItemId: "PP-104", name: "Dal Makhani", basePrice: 220 },
        { posItemId: "PP-105", name: "Jeera Rice", basePrice: 180 }
    ];
};
