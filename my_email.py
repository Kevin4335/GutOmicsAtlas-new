import smtplib
from email import encoders
from email.mime.base import MIMEBase
from email.mime.image import MIMEImage
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText


EMAIL_NAME = "gutomicsatlas@zohomail.com"
EMAIL_PASSWORD = "GutOmicsAtlasCornell1@"


def send_email(
    receiver: str,
    subject: str,
    content: str,
    attachments: list[tuple[str, bytes]] | None = None,
):
    message = MIMEMultipart()
    message["From"] = EMAIL_NAME
    message["To"] = receiver
    message["Subject"] = subject
    message.attach(MIMEText(content, "plain"))
    if attachments:
        for filename, raw in attachments:
            if filename.lower().endswith(".png"):
                part = MIMEImage(raw, _subtype="png")
            else:
                part = MIMEBase("application", "octet-stream")
                part.set_payload(raw)
                encoders.encode_base64(part)
            part.add_header("Content-Disposition", "attachment", filename=filename)
            message.attach(part)
    server = smtplib.SMTP("smtp.zoho.com", 587)
    server.starttls()
    server.login(EMAIL_NAME, EMAIL_PASSWORD)
    server.sendmail(EMAIL_NAME, receiver, message.as_string())
    server.quit()

if __name__ == '__main__':
    send_email('1246jtc@gmail.com', 'Test', 'This is a test email')
