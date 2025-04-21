from flask import Flask, request, send_file, render_template
import openai
import requests
import io
from flask_cors import CORS
import time


# Esta línea permite que Flask busque index.html en /example/templates y JS en /dist
app = Flask(__name__, static_folder='static', template_folder='templates')
CORS(app)

# Claves reales
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

    # 🕐 Inicio total
    total_start = time.time()

    # 🧠 ChatGPT
    start_chat = time.time()
    chat_response = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[{"role": "user", "content": prompt}],
        
    )
    texto = chat_response.choices[0].message.content
    end_chat = time.time()
    print(f"🧠 ChatGPT respondió en {end_chat - start_chat:.2f} segundos")

    # 🔊 ElevenLabs TTS
    start_tts = time.time()
    headers = {
        "xi-api-key": elevenlabs_api_key,
        "Content-Type": "application/json"
    }
    tts_data = {
        "text": texto,
        "voice_settings": {"stability": 0.4, "similarity_boost": 0.75},
        "model_id": "eleven_monolingual_v1"
    }
    tts_url = f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}"
    tts_response = requests.post(tts_url, headers=headers, json=tts_data)
    end_tts = time.time()
    print(f"🔊 ElevenLabs generó audio en {end_tts - start_tts:.2f} segundos")

    # 🧾 Total
    total_end = time.time()
    print(f"✅ Tiempo total: {total_end - total_start:.2f} segundos")

    return send_file(io.BytesIO(tts_response.content), mimetype="audio/mpeg")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)

