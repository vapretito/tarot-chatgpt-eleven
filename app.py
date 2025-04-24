from flask import Flask, request, send_file, render_template
import openai
import requests
import io
from flask_cors import CORS
import time
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4

app = Flask(__name__, static_folder='static', template_folder='templates')
CORS(app)

openai.api_key = "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"
elevenlabs_api_key = "sk_8478bd20a7bb4273ec7576787698be84e16637166965124c"
VOICE_ID = "51YRucvcq5ojp2byev44"

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

    if idioma == "en":
        system_prompt = (
            "You are a mystical tarot master with a calm and wise voice. "
            "Speak with clarity and poetic depth, interpreting each card as a whisper from the cosmos. "
            "Your words should feel ancient and powerful, like messages carried through time."
        )
    else:
        system_prompt = (
            "Eres un maestro tarotista de voz sabia y ancestral. Hablas con serenidad, como si las palabras "
            "fluyeran desde un conocimiento profundo del alma humana. Cada interpretación de carta debe sentirse "
            "como un susurro del universo, revelando verdades ocultas con calma, claridad y misticismo."
        )

    # 💬 ChatGPT Response
    chat_response = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt}
        ]
    )
    texto = chat_response.choices[0].message.content

    # 📝 PDF Creation
    buffer = io.BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    pdf.setFont("Helvetica-Bold", 16)
    pdf.drawString(72, height - 72, f"Lectura de Tarot para {nombre}")
    pdf.setFont("Helvetica", 12)

    y = height - 110
    for line in texto.split('\n'):
        if y < 72:
            pdf.showPage()
            y = height - 72
            pdf.setFont("Helvetica", 12)
        pdf.drawString(72, y, line)
        y -= 20

    pdf.save()
    buffer.seek(0)
    with open("static/lectura.pdf", "wb") as f:
        f.write(buffer.getvalue())

    # 🔊 ElevenLabs TTS con parámetros
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
            "speed": 0.85  # más lento que normal
        }
    }

    tts_url = f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}"
    tts_response = requests.post(tts_url, headers=headers, json=tts_data)

    if tts_response.status_code != 200:
        return {"error": "Failed to generate audio", "detail": tts_response.text}, 500

    return send_file(io.BytesIO(tts_response.content), mimetype="audio/mpeg")


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
