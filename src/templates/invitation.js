const { getAbsoluteServerUrl } = require("@strapi/utils/lib/");

const invitationTemplate = `
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office"><head>
      <!--[if gte mso 9]>
      <xml>
         <o:OfficeDocumentSettings>
            <o:AllowPNG/>
            <o:PixelsPerInch>96</o:PixelsPerInch>
         </o:OfficeDocumentSettings>
      </xml>
      <![endif]--> 
      <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta name="x-apple-disable-message-reformatting">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <title>Restablecer Contraseña de tu Cuenta</title>
      <style type="text/css"> @media only screen and (min-width: 520px){.u-row{width: 500px !important;}.u-row .u-col{vertical-align: top;}.u-row .u-col-100{width: 500px !important;}}@media (max-width: 520px){.u-row-container{max-width: 100% !important; padding-left: 0px !important; padding-right: 0px !important;}.u-row .u-col{min-width: 320px !important; max-width: 100% !important; display: block !important;}.u-row{width: 100% !important;}.u-col{width: 100% !important;}.u-col>div{margin: 0 auto;}}body{margin: 0; padding: 0;}table, tr, td{vertical-align: top; border-collapse: collapse;}p{margin: 0;}.ie-container table, .mso-container table{table-layout: fixed;}*{line-height: inherit;}a[x-apple-data-detectors='true']{color: inherit !important; text-decoration: none !important;}table, td{color: #000000;}</style>
      <link href="https://fonts.googleapis.com/css?family=Montserrat:400,700&amp;display=swap" rel="stylesheet" type="text/css">
   </head>
   <body class="clean-body u_body" style="margin: 0;padding: 0;-webkit-text-size-adjust: 100%;background-color: #EEF0F2;color: #000000">
      <table style="border-collapse: collapse;table-layout: fixed;border-spacing: 0;mso-table-lspace: 0pt;mso-table-rspace: 0pt;vertical-align: top;min-width: 320px;Margin: 0 auto;background-color: #EEF0F2;width:100%" cellpadding="0" cellspacing="0">
         <tbody>
            <tr style="vertical-align: top">
               <td style="word-break: break-word;border-collapse: collapse !important;vertical-align: top">
                  <div class="u-row-container" style="padding: 0px;background-color: transparent">
                     <div class="u-row" style="Margin: 0 auto;min-width: 320px;max-width: 500px;overflow-wrap: break-word;word-wrap: break-word;word-break: break-word;background-color: transparent;">
                        <div style="border-collapse: collapse;display: table;width: 100%;height: 100%;background-color: transparent;">
                           <div class="u-col u-col-100" style="max-width: 320px;min-width: 500px;display: table-cell;vertical-align: top;">
                              <div style="height: 100%;width: 100% !important;">
                                 <div style="box-sizing: border-box; height: 100%; padding: 20px 0px;border-top: 0px solid transparent;border-left: 0px solid transparent;border-right: 0px solid transparent;border-bottom: 0px solid transparent;">
                                    <table style="font-family:'Montserrat',sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
                                       <tbody>
                                          <tr>
                                             <td style="overflow-wrap:break-word;word-break:break-word;padding:0px;font-family:'Montserrat',sans-serif;" align="left">
                                                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                                   <tbody>
                                                      <tr>
                                                         <td style="padding-right: 0px;padding-left: 0px;" align="center"> <img align="center" border="0" src="${ getAbsoluteServerUrl( strapi.config ) }/uploads/lumar_temporal_logo_22c5644d05.png" alt="lumar_logo" title="lumar_logo" style="outline: none;text-decoration: none;-ms-interpolation-mode: bicubic;clear: both;display: inline-block !important;border: none;height: auto;float: none;width: 200px%;max-width: 200px;"> </td>
                                                      </tr>
                                                   </tbody>
                                                </table>
                                             </td>
                                          </tr>
                                       </tbody>
                                    </table>
                                 </div>
                              </div>
                           </div>
                        </div>
                     </div>
                  </div>
                  <div class="u-row-container" style="padding: 0px;background-color: transparent">
                     <div class="u-row" style="Margin: 0 auto;min-width: 320px;max-width: 500px;overflow-wrap: break-word;word-wrap: break-word;word-break: break-word;background-color: transparent;">
                        <div style="border-collapse: collapse;display: table;width: 100%;height: 100%;background-color: transparent;">
                           <div class="u-col u-col-100" style="max-width: 320px;min-width: 500px;display: table-cell;vertical-align: top;">
                              <div style="background-color: #ffffff;height: 100%;width: 100% !important;border-radius: 0px;-webkit-border-radius: 0px; -moz-border-radius: 0px;">
                                 <div style="box-sizing: border-box;height: 100%;padding: 40px;border-top: 1px solid rgba(151, 152, 153, 0.5);border-left: 1px solid rgba(151, 152, 153, 0.5);border-right: 1px solid rgba(151, 152, 153, 0.5);border-bottom: 1px solid rgba(151, 152, 153, 0.5);border-radius: 0px;-webkit-border-radius: 0px;-moz-border-radius: 0px;">
                                    <table style="font-family:'Montserrat',sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
                                       <tbody>
                                          <tr>
                                             <td style="overflow-wrap:break-word;word-break:break-word;padding:0px;font-family:'Montserrat',sans-serif;" align="left">
                                                <h1 style="margin: 0px;color: #4F4CB6;line-height: 150%;text-align: center;word-wrap: break-word;font-size: 22px;font-weight: 700;">Acepta la Invitación a Lumar</h1>
                                             </td>
                                          </tr>
                                       </tbody>
                                    </table>
                                    <table style="font-family:'Montserrat',sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
                                       <tbody>
                                          <tr>
                                             <td style="overflow-wrap:break-word;word-break:break-word;padding:0px;font-family:'Montserrat',sans-serif;" align="left">
                                                <div style="font-size: 14px;color: #231F20;line-height: 150%;text-align: center;word-wrap: break-word;">
                                                   <p style="line-height: 150%;"><%=invitedBy%> te está invitando a que te registres como usuario de la plataforma administrativa de Lumar. Si deseas aceptar su invitación haz click a continuación:</p>
                                                </div>
                                             </td>
                                          </tr>
                                       </tbody>
                                    </table>
                                    <table style="font-family:'Montserrat',sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
                                       <tbody>
                                          <tr>
                                             <td style="overflow-wrap:break-word;word-break:break-word;padding:20px 0px;font-family:'Montserrat',sans-serif;" align="left">
                                                <a href="${ process.env.APP_URL }/auth/register?token=<%=invitationUuid%>" style="display: block;width: 100%;border: none;border-radius: 4px;background-color: #4F4CB6;color: white;font-family: inherit;font-size: 14px;font-weight: 600;text-align: center;text-decoration: none;padding: 9px 0;">Crear mi Cuenta</a>
                                             </td>
                                          </tr>
                                       </tbody>
                                    </table>
                                    <table style="font-family:'Montserrat',sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
                                       <tbody>
                                          <tr>
                                             <td style="overflow-wrap:break-word;word-break:break-word;padding:0px;font-family:'Montserrat',sans-serif;" align="left">
                                                <div style="font-size: 14px;color: #231F20;line-height: 150%;text-align: center;word-wrap: break-word;">
                                                   <p style="line-height: 150%;">Únicamente tendrás que verificar y completar tus datos para poder comenzar.</p>
                                                </div>
                                             </td>
                                          </tr>
                                       </tbody>
                                    </table>

                                    <table style="font-family:'Montserrat',sans-serif;margin-top: 20px;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
                                       <tbody>
                                          <tr>
                                             <td style="overflow-wrap:break-word;word-break:break-word;padding:0px;font-family:'Montserrat',sans-serif;" align="left">
                                                <div style="font-size: 12px;color: #231F20;line-height: 150%;text-align: center;word-wrap: break-word;">
                                                   <p style="line-height: 150%;">Si desconoces el origen de este correo, por favor ignóralo.</p>
                                                </div>
                                             </td>
                                          </tr>
                                       </tbody>
                                    </table>
                                 </div>
                              </div>
                           </div>
                        </div>
                     </div>
                  </div>
               </td>
            </tr>
         </tbody>
      </table>
   
</body></html>
`;

module.exports = invitationTemplate;