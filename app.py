from flask import Flask, request, send_file, render_template
import openai
import requests
import io
from flask_cors import CORS
from reportlab.lib.pagesizes import A4
from reportlab.platypus import BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.colors import HexColor



app = Flask(__name__, static_folder='static', template_folder='templates')
CORS(app)

openai.api_key = "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"
elevenlabs_api_key = "sk_8478bd20a7bb4273ec7576787698be84e16637166965124c"
VOICE_ID = "51YRucvcq5ojp2byev44"

def create_mystic_pdf(texto, nombre):
    buffer = io.BytesIO()
    width, height = A4
    margin = 60

    # 🔮 Fondo oscuro por página
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

    mystic_style = ParagraphStyle(
        name='Mystic',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=12,
        leading=18,
        textColor=HexColor("#FFEFD5"),
    )

    title_style = ParagraphStyle(
        name='Title',
        parent=styles['Heading1'],
        alignment=1,
        fontSize=18,
        leading=24,
        textColor=HexColor("#FFDEAD"),
        spaceAfter=20
    )

    elements = []
    elements.append(Paragraph(f"🔮 Lectura del Tarot para {nombre}", title_style))
    elements.append(Spacer(1, 12))

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
    buffer = create_mystic_pdf(texto, nombre)
    with open("static/lectura.pdf", "wb") as f:
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

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
