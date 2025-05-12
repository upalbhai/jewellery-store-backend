import nodemailer from 'nodemailer';

const sendEmail = async (to, subject, html) => {
  console.log('totot',to)
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: '"Your App" <no-reply@yourapp.com>',
    to,
    subject,
    html,
  };

  await transporter.sendMail(mailOptions);
};

export default sendEmail;
