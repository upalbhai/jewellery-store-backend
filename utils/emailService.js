import nodemailer from "nodemailer";

export const sendNewProductEmail = async (userEmail, products) => {
    try {
        // return
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER, // Your email
                pass: process.env.EMAIL_PASS, // Your app password
            },
        });

        // Generate product list dynamically
        const productHtml = products.map(
            (product) => `
            <div style="text-align: center; margin-bottom: 20px;">
                <img src="${product.image}" alt="${product.name}" style="width: 200px; height: auto; border-radius: 10px;" />
                <h3 style="color: #333;">${product.name}</h3>
                <p style="color: #666;">${product.description}</p>
                <p style="font-weight: bold; color: #ff6600;">Price: $${product.price}</p>
                <a href="${product.link}" style="background: #ff6600; color: #fff; padding: 10px 15px; text-decoration: none; border-radius: 5px;">
                    View Product
                </a>
            </div>
        `
        ).join("");

        const emailContent = `
            <div style="max-width: 600px; margin: auto; padding: 20px; font-family: Arial, sans-serif; background: #f9f9f9;">
                <h2 style="color: #333; text-align: center;">🔥 New Arrivals Just for You! 🔥</h2>
                ${productHtml}
                <p style="text-align: center; color: #888;">Visit our website for more amazing products.</p>
            </div>
        `;

        const mailOptions = {
            from: `"Your Shop" <${process.env.EMAIL_USER}>`,
            to: userEmail,
            subject: "🚀 New Arrivals in Our Store!",
            html: emailContent,
        };

        await transporter.sendMail(mailOptions);
        // console.log("Email sent successfully to:", userEmail);
    } catch (error) {
        console.error("Error sending email:", error);
    }
};
