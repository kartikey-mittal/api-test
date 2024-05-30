const express = require('express');
const { Client, Databases, Query } = require('appwrite');

const app = express();
const port = process.env.PORT || 3000;

// Initialize Appwrite Client
const client = new Client()
  .setEndpoint('https://cloud.appwrite.io/v1') // Your Appwrite endpoint
  .setProject('65773c8581b895f83d40'); // Your Appwrite project ID

const databases = new Databases(client);

app.use(express.json());

app.get('/api/orders', async (req, res) => {
    const shopId = req.query.shopId;
    const ticketSize = req.query.ticketSize || 500;

    if (!shopId) {
        return res.status(400).json({ error: 'ShopId is required' });
    }

    try {
        // Fetch orders for the given shopId
        const response = await databases.listDocuments('data-level-1', 'OrdersDB', [
            Query.equal('Store-ID', shopId)
        ]);
        const orders = response.documents;

        // Calculate total order value
        let totalOrderValue = 0;
        orders.forEach(order => {
            totalOrderValue += parseFloat(order['Order-Value']);
        });

        // Check if total order value plus ticketSize is greater than 500
        if (totalOrderValue + ticketSize > req.query.ticketSize) {

            console.log('Updating orders...');
            await Promise.all(orders.map(async order => {
                console.log(`Attempting to update document with ID: ${order['$id']}...`);
                try {
                    const updateResult = await databases.updateDocument('data-level-1', 'OrdersDB', order['$id'], {
                        'Order-Status': 'Waiting List Accepted'
                    });
                    console.log(`Update successful for document ID: ${order['$id']}`);
                } catch (updateError) {
                    console.error(`Failed to update document ID: ${order['$id']}. Error:`, updateError);
                }
            }));
        }

        res.json({ totalOrderValue, count_updated: orders.filter(order => order['Order-Status'] === 'Waiting List Accepted').length });
    } catch (error) {
        console.error('Error querying Appwrite:', error);
        res.status(500).send('Server Error');
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
