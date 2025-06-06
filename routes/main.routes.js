import userRoutes from './user.routes.js';
import productRoutes from './product.routes.js';
import reviewRoutes from './review.routes.js';
import orderRoutes from './order.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import customOrderRoutes from './custom-order.routes.js';
import adminSettingsRoutes from './admin-setting.routes.js';

const setupRoutes = (app)=>{
    app.use('/api/v1/user',userRoutes);
    app.use('/api/v1/product',productRoutes);
    app.use('/api/v1/review',reviewRoutes);
    app.use('/api/v1/order',orderRoutes);
    app.use('/api/v1/dashboard',dashboardRoutes);
    app.use('/api/v1/custom-order',customOrderRoutes);
    app.use('/api/v1/admin-settings',adminSettingsRoutes);
}

export default setupRoutes;
