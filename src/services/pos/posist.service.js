export const fetchMenu = async (credentials) => {
    // Mock API call
    console.log("Fetching Posist menu with credentials...", credentials?.apiKey ? "Key Present" : "No Key");

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    return [
        { posItemId: "POS-A1", name: "Veg Burger", basePrice: 150 },
        { posItemId: "POS-A2", name: "Fries", basePrice: 90 },
        { posItemId: "POS-A3", name: "Coke", basePrice: 60 },
        { posItemId: "POS-A4", name: "Chicken Burger", basePrice: 200 }
    ];
};
