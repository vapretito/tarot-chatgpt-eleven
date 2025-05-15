from flask import Flask, request, send_file, render_template
import openai
import requests
import io
from flask_cors import CORS
from reportlab.lib.pagesizes import A4
from reportlab.platypus import BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.colors import HexColor
from reportlab.platypus import Image  # ya lo tienes
import smtplib
from email.message import EmailMessage




app = Flask(__name__, static_folder='static', template_folder='templates')
CORS(app)

openai.api_key = "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"
elevenlabs_api_key = "sk_8478bd20a7bb4273ec7576787698be84e16637166965124c"
VOICE_ID = "51YRucvcq5ojp2byev44"

def create_mystic_pdf(texto, nombre, cartas):
    buffer = io.BytesIO()
    width, height = A4
    margin = 60

    def draw_background(canvas, doc):
        canvas.saveState()
        canvas.setFillColor(HexColor("#120010"))
        canvas.rect(0, 0, width, height, stroke=0, fill=1)
        canvas.restoreState()

    doc = BaseDocTemplate(buffer, pagesize=A4,
                          leftMargin=margin, rightMargin=margin,
                          topMargin=80, bottomMargin=60)

    frame = Frame(margin, 60, width - 2 * margin, height - 140, id='normal')
    template = PageTemplate(id='mystic', frames=[frame], onPage=draw_background)
    doc.addPageTemplates([template])

    styles = getSampleStyleSheet()
    mystic_style = ParagraphStyle(name='Mystic', parent=styles['Normal'], fontSize=12, leading=18, textColor=HexColor("#FFEFD5"))
    title_style = ParagraphStyle(name='Title', parent=styles['Heading1'], alignment=1, fontSize=18, leading=24, textColor=HexColor("#FFDEAD"), spaceAfter=20)

    elements = [Paragraph(f"🔮 Lectura del Tarot para {nombre}", title_style), Spacer(1, 12)]

    # 🔮 Agregar cartas como imágenes
    for idx in cartas:
        try:
            path = f"static/tarot/RWSa-T-{str(idx).zfill(2)}.png"
            elements.append(Image(path, width=120, height=190))
            elements.append(Spacer(1, 10))
        except Exception as e:
            print(f"❌ Error al cargar imagen de carta {idx}: {e}")

    for line in texto.strip().split('\n'):
        if line.strip():
            elements.append(Paragraph(line.strip(), mystic_style))
            elements.append(Spacer(1, 12))

    elements.append(Spacer(1, 24))
    elements.append(Paragraph("✨ El Oráculo habla… escucha con el alma ✨", mystic_style))

    doc.build(elements)
    buffer.seek(0)
    return buffer

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/respuesta", methods=["POST"])
def respuesta():
    from openai import OpenAI
    client = OpenAI(api_key=openai.api_key)

    data = request.json
    prompt = data.get("texto", "Hola")
    idioma = data.get("idioma", "es")
    nombre = data.get("nombre", "Consultante")

    system_prompt = (
        "You are a mystical tarot master with a calm and wise voice. "
        "Speak with clarity and poetic depth, interpreting each card as a whisper from the cosmos. "
        "Your words should feel ancient and powerful, like messages carried through time."
    ) if idioma == "en" else (
        "Eres un maestro tarotista de voz sabia y ancestral. Hablas con serenidad, como si las palabras "
        "fluyeran desde un conocimiento profundo del alma humana. Cada interpretación de carta debe sentirse "
        "como un susurro del universo, revelando verdades ocultas con calma, claridad y misticismo."
    )

    chat_response = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt}
        ]
    )
    texto = chat_response.choices[0].message.content
    

    # 🧾 Generar PDF
    cartas = data.get("cartas", [])
    buffer = create_mystic_pdf(texto, nombre, cartas)
    email_destinatario = data.get("email", "").strip()  # ahora con fallback
    try:
       if email_destinatario:
        print("📧 Enviando PDF a:", email_destinatario)
        enviar_pdf_por_correo(email_destinatario, buffer)
    except Exception as e:
        print("❌ Error al enviar PDF por correo:", e)


    safe_name = nombre.lower().replace(" ", "_")
    nombre_pdf = f"lectura_{safe_name}.pdf"



    with open(f"static/{nombre_pdf}", "wb") as f:
        f.write(buffer.getvalue())

    # 🎧 ElevenLabs TTS
    headers = {
        "xi-api-key": elevenlabs_api_key,
        "Content-Type": "application/json"
    }

    tts_data = {
        "text": texto,
        "model_id": "eleven_multilingual_v2",
        "voice_settings": {
            "stability": 0.66,
            "similarity_boost": 0.56,
            "style": 0.0,
            "use_speaker_boost": True,
            "speed": 0.85
        }
    }

    tts_url = f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}"
    tts_response = requests.post(tts_url, headers=headers, json=tts_data)

    if tts_response.status_code != 200:
        return {"error": "Failed to generate audio", "detail": tts_response.text}, 500

    return send_file(io.BytesIO(tts_response.content), mimetype="audio/mpeg")
def enviar_pdf_por_correo(destinatario, buffer_pdf, nombre_archivo="lectura.pdf"):
    remitente = "titomanbarreto@gmail.com"
    contraseña = "gefz hhfl fpok skcd"  # Se recomienda usar contraseña de aplicación (no la principal)
    
    mensaje = EmailMessage()
    mensaje['Subject'] = '✨ Tu Lectura de Tarot'
    mensaje['From'] = remitente
    mensaje['To'] = destinatario
    mensaje.set_content("Aquí tienes tu lectura mística del tarot en formato PDF. ✨")

    # Adjuntar PDF desde buffer
    mensaje.add_attachment(
        buffer_pdf.getvalue(),
        maintype='application',
        subtype='pdf',
        filename=nombre_archivo
    )

    with smtplib.SMTP_SSL('smtp.gmail.com', 465) as smtp:
        smtp.login(remitente, contraseña)
        smtp.send_message(mensaje)


@app.route("/enviar_pdf", methods=["POST"])
def enviar_pdf_manual():
    data = request.json
    email = data.get("email", "").strip()
    nombre = data.get("nombre", "Consultante").strip()
    if not email:
        return {"error": "No se especificó un correo"}, 400

    safe_name = nombre.lower().replace(" ", "_")
    nombre_pdf = f"lectura_{safe_name}.pdf"
    pdf_path = f"static/{nombre_pdf}"

    try:
        with open(pdf_path, "rb") as f:
            buffer = io.BytesIO(f.read())
        enviar_pdf_por_correo(email, buffer, nombre_pdf)
        return {"success": True}
    except FileNotFoundError:
        return {"error": "PDF no encontrado"}, 404


@app.route("/test-correo")
def test_correo():
    with open("static/lectura.pdf", "rb") as f:
        buffer = io.BytesIO(f.read())
    try:
        enviar_pdf_por_correo("vbarreto15@gmail.com", buffer)
        return "✅ Correo enviado"
    except Exception as e:
        return f"❌ Error: {e}"

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
