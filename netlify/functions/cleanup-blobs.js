const { getStore } = require('@netlify/blobs');

exports.handler = async (event, context) => {
    // Only allow scheduled triggers or manual calls with auth
    const authHeader = event.headers['authorization'] || '';
    const expectedKey = process.env.CLEANUP_SECRET || 'cleanup-key-change-me';
    const isScheduled = context?.clientContext?.custom?.scheduled === true;

    if (!isScheduled && authHeader !== `Bearer ${expectedKey}`) {
        return {
            statusCode: 401,
            body: JSON.stringify({ error: 'Unauthorized' })
        };
    }

    try {
        const store = getStore({
            name: 'form-uploads',
            siteID: process.env.NETLIFY_SITE_ID,
            token: process.env.NETLIFY_TOKEN
        });

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        console.log(`🧹 Cleaning up blobs older than ${thirtyDaysAgo.toISOString()}`);

        let deletedCount = 0;
        let skippedCount = 0;
        let cursor = null;

        while (true) {
            const listOptions = { paginate: true };
            if (cursor) listOptions.cursor = cursor;

            const { blobs, cursor: nextCursor } = await store.list(listOptions);

            if (!blobs || blobs.length === 0) break;

            for (const blob of blobs) {
                try {
                    // The key format is: timestamp/inputName/filename
                    // Extract timestamp from the key
                    const timestamp = parseInt(blob.key.split('/')[0], 10);

                    if (isNaN(timestamp)) {
                        console.log(`  ⚠️ Skipping ${blob.key} - no valid timestamp`);
                        skippedCount++;
                        continue;
                    }

                    const blobDate = new Date(timestamp);

                    if (blobDate < thirtyDaysAgo) {
                        await store.delete(blob.key);
                        console.log(`  🗑️ Deleted: ${blob.key} (${blobDate.toISOString()})`);
                        deletedCount++;
                    } else {
                        skippedCount++;
                    }
                } catch (err) {
                    console.error(`  ❌ Error processing ${blob.key}:`, err.message);
                }
            }

            if (!nextCursor) break;
            cursor = nextCursor;
        }

        const summary = `✅ Cleanup complete. Deleted: ${deletedCount}, Kept: ${skippedCount}`;
        console.log(summary);

        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                message: summary,
                deleted: deletedCount,
                kept: skippedCount
            })
        };

    } catch (error) {
        console.error('❌ Cleanup error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ success: false, error: error.message })
        };
    }
};