import express, { Request, Response } from 'express';

const app = express();

app.use(express.json());



// Start Server
if (require.main === module) {
    // Run seed before listening
   
        app.listen(3000, () => console.log('Backend running on port 3000'));
    ;
}