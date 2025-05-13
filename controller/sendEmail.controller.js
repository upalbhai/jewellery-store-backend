import { Product } from "../models/product.model.js";
import { User } from "../models/user.model.js";
import { sendNewProductEmail } from "../utils/emailService.js";

export const sendEmailsToCustomers = async (req, res) => {
    try {
        // Fetch all users
        const users = await User.find({}, "email");

        // Fetch latest 5 products
        const newProducts = await Product.find()
            .sort({ createdAt: -1 }) // Sort by newest
            .limit(5)
            .select("name description price images");

        if (newProducts.length === 0) {
            return res.status(400).json({ message: "No new products found." });
        }

        // Convert products to required format  
        const productData = newProducts.map((product) => ({
            name: product.name,
            description: product.description,
            price: product.price,
            image: `${process.env.BACKEND_URL}${product.images[0]}`, // Send first image
            link: `${process.env.HOSTER_FRONTEND_URL}/product/${product._id}`,
        }));

        // Send emails
        for (const user of users) {
            await sendNewProductEmail(user.email, productData);
        }

        res.status(200).json({ message: "Emails sent successfully!" });
    } catch (error) {
        console.error("Error sending emails:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};
