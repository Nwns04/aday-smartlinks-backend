const fetch = (...args) =>
  import('node-fetch').then(({ default: fetch }) => fetch(...args));

const HF_TOKEN = process.env.HF_API_TOKEN;

async function generateCopy(prompt) {
  const res = await fetch(
    'https://api-inference.huggingface.co/models/mistralai/Mixtral-8x7B-Instruct-v0.1',
    {
      headers: {
        Authorization: `Bearer ${HF_TOKEN}`,
        'Content-Type': 'application/json',
      },
      method: 'POST',
      body: JSON.stringify({ inputs: prompt }),
    }
  );

  const data = await res.json();

  return data[0]?.generated_text || '';
}

exports.generateCopy = generateCopy;

