
import express from 'express';
import { bot } from './bot'; // Assuming bot is exported from another file

const app = express();
const port = process.env.PORT || 3000;

app.get('/update', async (req, res) => {
    try {
        bot.handleUpdate(req.body)
        res.send('Bot updated and launched successfully!');
    } catch (error) {
        console.error('Error updating bot:', error);
        res.status(500).send('Failed to update and launch bot.');
    }
});


if (process.env.NODE_ENV === 'development') {
    bot.launch({ dropPendingUpdates: true })
    console.log('Bot is running in development mode.');
} else {
    app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
    });
}

