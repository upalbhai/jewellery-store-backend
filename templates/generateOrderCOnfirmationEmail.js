import dotenv from "dotenv";


dotenv.config();

export const generateOrderConfirmationEmail = (savedOrder) => {
  const imagePath = savedOrder.products[0].productId.images?.[0]?.replace(/\\/g, '/');
  console.log(`${process.env.BACKEND_URL}/${imagePath}`);
    return `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f4f9f9; color: #1a2c2e;">
      <!-- Header -->
      <div style="background-color: #1a2c2e; padding: 30px; text-align: center;">
        <h1 style="color: #f2ece2; margin: 0; font-size: 24px; font-weight: 600;">Order Confirmation</h1>
      </div>
      
      <!-- Main Content -->
      <div style="padding: 30px;">
        <div style="background-color: white; border-radius: 8px; padding: 25px; margin-bottom: 20px; border: 1px solid #dcebea;">
          <p style="font-size: 16px; margin-bottom: 20px;">Thank you for your order! We're preparing your items and will notify you when they ship.</p>
          
          <div style="background-color: #dcebea; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
            <h2 style="color: #3a6567; margin-top: 0; font-size: 18px;">Order #${savedOrder._id}</h2>
            <p style="margin-bottom: 5px;"><strong>Date:</strong> ${new Date(savedOrder.createdAt).toLocaleDateString()}</p>
            <p style="margin-bottom: 5px;"><strong>Status:</strong> <span style="color: #325153;">Confirmed</span></p>
            <p style="margin-bottom: 0;"><strong>Total:</strong> <span style="font-size: 18px; color: #1a2c2e; font-weight: 600;">₹${savedOrder.totalAmount.toFixed(2)}</span></p>
          </div>
        </div>
        
        <!-- Order Items -->
        <div style="background-color: white; border-radius: 8px; padding: 25px; margin-bottom: 20px; border: 1px solid #dcebea;">
          <h2 style="color: #3a6567; margin-top: 0; font-size: 18px; border-bottom: 1px solid #dcebea; padding-bottom: 10px;">Order Details</h2>
          
          ${savedOrder.products.map(item => {
            // Sanitize the image path to ensure forward slashes
            const rawImagePath = item.productId.images?.[0];
            let imageUrl = 'https://via.placeholder.com/80';
          
            if (rawImagePath) {
              // Replace backslashes with forward slashes
              const imagePath = rawImagePath.replace(/\\/g, '/');
              // Encode only the filename part to handle spaces and special characters
              const parts = imagePath.split('/');
              const encodedParts = parts.map((part, idx) => (idx === parts.length - 1 ? encodeURIComponent(part) : part));
              const encodedImagePath = encodedParts.join('/');
              imageUrl = `${process.env.BACKEND_URL}/${encodedImagePath}`;
            }
          
            return `
              <div style="display: flex; margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid #dcebea;">
                <div style="flex: 0 0 80px; margin-right: 15px;">
                  <img src="${imageUrl}" alt="${item.productId.name}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 4px;" />
                </div>
                <div style="flex: 1;">
                  <h3 style="margin-top: 0; margin-bottom: 5px; color: #1a2c2e;">${item.productId.name}</h3>
                  <p style="margin: 5px 0; color: #659c9c;">${item.productId.category}</p>
                  <p style="margin: 5px 0;">Quantity: ${item.quantity}</p>
                  <p style="margin: 5px 0; font-weight: 600;">₹${item.productId.price}</p>
                </div>
              </div>
            `;
          }).join('')}
          
          
        </div>
        
        <!-- Delivery Info -->
        <div style="background-color: white; border-radius: 8px; padding: 25px; border: 1px solid #dcebea;">
          <h2 style="color: #3a6567; margin-top: 0; font-size: 18px; border-bottom: 1px solid #dcebea; padding-bottom: 10px;">Delivery Information</h2>
          <p style="margin-bottom: 5px;"><strong>Shipping to:</strong></p>
          <p style="margin: 5px 0;">${savedOrder.deliveryAddress.line}</p>
          ${savedOrder.deliveryAddress.line2 ? `<p style="margin: 5px 0;">${savedOrder.deliveryAddress.line2}</p>` : ''}
          <p style="margin: 5px 0;">${savedOrder.deliveryAddress.city}, ${savedOrder.deliveryAddress.state}</p>
          <p style="margin: 5px 0;">${savedOrder.deliveryAddress.zipCode}</p>
        </div>
      </div>
      
      <!-- Footer -->
      <div style="background-color: #1a2c2e; padding: 20px; text-align: center; color: #f2ece2; font-size: 14px;">
        <p style="margin: 0;">Thank you for shopping with us!</p>
        <p style="margin: 10px 0 0 0;">If you have any questions, please contact our support team.</p>
      </div>
    </div>
  `;
};