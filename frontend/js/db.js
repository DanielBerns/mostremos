// Initialize the local database
const db = new Dexie('CrowdsourceAppDB');

// Define the schema.
// '++id' means auto-incrementing primary key.
// We index 'status' so we can easily query for 'pending' records when back online.
db.version(1).stores({
    submissions: '++id, status, timestamp, lat, lon',
    tags: 'id' // To locally cache the bilingual tags list
});

// Helper function to save a submission locally
async function saveToLocalQueue(submissionData, imageBlob) {
    try {
        const id = await db.submissions.add({
            status: 'pending',
            timestamp: new Date().toISOString(),
                                            lat: submissionData.lat,
                                            lon: submissionData.lon,
                                            payload: submissionData.payload,
                                            image: imageBlob // IndexedDB can store binary Blobs natively!
        });
        console.log(`Saved locally with ID: ${id}`);
        return id;
    } catch (error) {
        console.error("Failed to save to local queue:", error);
        throw error;
    }
}
