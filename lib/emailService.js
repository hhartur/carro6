const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS 
    }
});

const sendVerificationEmail = async (to, code) => {
    const mailOptions = {
        from: `"Smart Garage Nexus" <${process.env.EMAIL_USER}>`,
        to: to,
        subject: 'Seu código de verificação - Smart Garage Nexus',
        html: `
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Verificação de Conta</title>
                <style>
                    /* Reset básico */
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    
                    /* Responsivo */
                    @media only screen and (max-width: 600px) {
                        .container { width: 95% !important; padding: 20px !important; }
                        .header-title { font-size: 22px !important; }
                        .code-text { font-size: 28px !important; letter-spacing: 4px !important; }
                        .info-cards { display: block !important; }
                        .info-card { margin-bottom: 15px !important; }
                        .padding-mobile { padding: 20px !important; }
                    }
                </style>
            </head>
            <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0c0f1a; color: #dde4f0; line-height: 1.6;">
                
                <!-- Container principal -->
                <div style="width: 100%; padding: 30px 0; background-color: #0c0f1a;">
                    <div class="container" style="max-width: 600px; width: 90%; margin: 0 auto; background: linear-gradient(135deg, #141a2e 0%, #232c47 100%); border-radius: 12px; border: 1px solid #3a4460; box-shadow: 0 8px 32px rgba(0,0,0,0.3); overflow: hidden;">
                        
                        <!-- Conteúdo principal -->
                        <div class="padding-mobile" style="padding: 40px 30px;">
                            
                            <!-- Título da seção -->
                            <h2 style="text-align: center; color: #dde4f0; font-size: 22px; font-weight: 600; margin: 0 0 15px 0;">
                                Verificação de Conta
                            </h2>
                            
                            <!-- Descrição -->
                            <p style="text-align: center; color: #a0aec0; font-size: 15px; margin: 0 0 35px 0; max-width: 400px; margin-left: auto; margin-right: auto;">
                                Digite o código abaixo para verificar sua conta:
                            </p>
                            
                            <!-- Código de verificação -->
                            <div style="text-align: center; margin: 35px 0;">
                                <div style="display: inline-block; background: #0c0f1a; border: 3px solid #0ea5e9; border-radius: 12px; padding: 25px 35px; box-shadow: 0 0 25px rgba(14, 165, 233, 0.3);">
                                    <div class="code-text" style="font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #0ea5e9; font-family: 'Courier New', monospace; text-shadow: 0 0 10px rgba(14, 165, 233, 0.5);">
                                        ${code}
                                    </div>
                                </div>
                                <p style="margin: 15px 0 0 0; color: #718096; font-size: 12px;">
                                    Código válido por 10 minutos
                                </p>
                            </div>
                            
                            <!-- Aviso importante -->
                            <div style="background: rgba(239, 68, 68, 0.1); border-left: 4px solid #ef4444; border-radius: 6px; padding: 15px; margin: 25px 0;">
                                <p style="margin: 0; color: #a0aec0; font-size: 13px; text-align: center;">
                                    <strong style="color: #ef4444;">⚠️ Importante:</strong><br>
                                    Nunca compartilhe este código. Se você não fez esta solicitação, ignore este e-mail.
                                </p>
                            </div>
                            
                        </div>
                        
                        <!-- Footer -->
                        <div style="background: rgba(12, 15, 26, 0.5); padding: 25px 30px; text-align: center; border-top: 1px solid rgba(58, 68, 96, 0.3);">
                            <div style="color: #0ea5e9; font-weight: 600; font-size: 14px; margin-bottom: 8px;">
                                Smart Garage Nexus
                            </div>
                            <p style="margin: 0; color: #718096; font-size: 11px;">
                                E-mail automático do sistema • Não responda esta mensagem
                            </p>
                        </div>
                        
                    </div>
                </div>
                
            </body>
            </html>
        `
    };
    await transporter.sendMail(mailOptions);
};

module.exports = { sendVerificationEmail };