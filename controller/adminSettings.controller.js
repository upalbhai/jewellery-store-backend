import { AdminSettings } from "../models/adminSettings.model.js";
import { sendResponse } from "../utils/sendResponse.js";


export const getAdminSettings = async (req, res) => {
  try {
    let settings = await AdminSettings.findOne();
    if (!settings) {
      settings = await AdminSettings.create({
        aboutus: '',
        adminEmail: '',
        contactNumber: '',
        logo: '',
        mo_logo: '',
        name:'',
        socialmedialink: [],
      });
    }
    return sendResponse(res, 200, { data: settings });
  } catch (error) {
    return sendResponse(res, 500, { error: error.message });
  }
};

export const updateAdminSettings = async (req, res) => {
  try {
    let settings = await AdminSettings.findOne();

    // If not exists, create a new document
    if (!settings) {
      settings = new AdminSettings();
    }

    // Text fields
    const {
      aboutus,
      adminEmail,
      contactNumber,
      name,
      socialmedialink,
    } = req.body;

    if (aboutus) settings.aboutus = aboutus;
    if (adminEmail) settings.adminEmail = adminEmail;
    if (name) settings.name = name;
    if (contactNumber) settings.contactNumber = contactNumber;
    if (Array.isArray(socialmedialink)) settings.socialmedialink = socialmedialink;
    else if (typeof socialmedialink === 'string') {
      // Handle comma-separated string input from form-data
      settings.socialmedialink = socialmedialink.split(',').map(link => link.trim());
    }

    // File uploads via multer
    const files = req.files;
    if (files?.logo && files.logo[0]) {
      settings.logo = files.logo[0].filename; // or path/url based on your multer config
    }
    if (files?.mo_logo && files.mo_logo[0]) {
      settings.mo_logo = files.mo_logo[0].filename;
    }

    await settings.save();
    return sendResponse(res, 200, { data: settings });
  } catch (error) {
    return sendResponse(res, 400, { error: error.message });
  }
};