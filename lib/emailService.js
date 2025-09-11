const nodemailer = require('nodemailer');

// Configure isso no seu arquivo .env
const transporter = nodemailer.createTransport({
    service: 'Gmail', // ou outro
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS // Use senha de app para o Gmail
    }
});

const sendVerificationEmail = async (to, code) => {
    const mailOptions = {
        from: `"Smart Garage Nexus" <${process.env.EMAIL_USER}>`,
        to: to,
        subject: 'Seu código de verificação',
        html: `
            <div style="font-family: sans-serif; text-align: center; padding: 20px;">
                <h2>Verifique sua conta</h2>
                <p>Seu código de verificação é:</p>
                <p style="font-size: 24px; font-weight: bold; letter-spacing: 5px; background: #f0f0f0; padding: 10px 20px; border-radius: 5px; display: inline-block;">
                    ${code}
                </p>
                <p>Este código é válido por 10 minutos. Se você não se cadastrou, ignore este e-mail.</p>
            </div>
        `
    };
    await transporter.sendMail(mailOptions);
};

module.exports = { sendVerificationEmail };