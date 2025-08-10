const axios = require('axios');
require('dotenv').config();

class MistralAI {
    constructor() {
        this.apiKey = process.env.MISTRAL_API_KEY;
        this.model = process.env.MISTRAL_MODEL || 'mistral-large-latest';
        this.baseURL = 'https://api.mistral.ai/v1/chat/completions';
        
        if (!this.apiKey) {
            console.warn('⚠️ Mistral API key not found. AI features will be disabled.');
        }
    }

    async processCommand(message, studentsList = []) {
        if (!this.apiKey) {
            return { success: false, error: 'Mistral AI not configured' };
        }

        try {
            const prompt = this.buildPrompt(message, studentsList);
            
            const response = await axios.post(this.baseURL, {
                model: this.model,
                messages: [
                    {
                        role: 'system',
                        content: 'Kamu adalah asisten kas kelas yang membantu menganalisis perintah dan mencari nama siswa yang sesuai. Berikan response dalam format JSON yang valid.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: 500,
                temperature: 0.1
            }, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            const aiResponse = response.data.choices[0].message.content;
            return this.parseAIResponse(aiResponse);
            
        } catch (error) {
            console.error('Mistral AI Error:', error.message);
            return { success: false, error: 'AI processing failed' };
        }
    }

    buildPrompt(message, studentsList) {
        const studentsText = studentsList.map(s => `- ${s.name} (ID: ${s.id})`).join('\n');
        
        return `
Analisis perintah kas berikut: "${message}"

Daftar siswa yang tersedia:
${studentsText}

Tugas:
1. Identifikasi jenis transaksi (pemasukan/pengeluaran/iuran/reset)
2. Ekstrak jumlah uang (jika ada)
3. Cari nama siswa yang paling cocok dari daftar (jika disebutkan)
4. Ekstrak deskripsi/keterangan
5. Deteksi perintah reset (reset saldo/reset siswa/reset semua)

Contoh input: "kas 3000 muzaki"
- Jenis: iuran
- Jumlah: 3000
- Siswa: cari yang namanya mengandung "muzaki"
- Deskripsi: "Iuran kas"

Contoh reset:
"reset saldo kas" -> reset_type: "saldo" (hapus semua transaksi)
"reset kas siswa" -> reset_type: "siswa" (hapus hanya iuran siswa)
"reset keuangan siswa" -> reset_type: "siswa" (hapus hanya iuran siswa)
"reset semua" -> reset_type: "semua" (hapus semua data)

PENTING: Bedakan dengan jelas:
- "saldo kas" = reset_type: "saldo"
- "kas siswa"/"keuangan siswa" = reset_type: "siswa"
- "semua"/"total" = reset_type: "semua"

Berikan response dalam format JSON:
{
    "type": "income|expense|iuran|reset",
    "amount": number,
    "student_id": number_or_null,
    "student_name": "string_or_null",
    "description": "string",
    "reset_type": "saldo|siswa|semua|null",
    "confidence": 0.0-1.0
}`;
    }

    parseAIResponse(aiResponse) {
        try {
            // Clean the response to extract JSON
            const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in AI response');
            }
            
            const parsed = JSON.parse(jsonMatch[0]);
            
            // Validate required fields
            if (!parsed.type || !['income', 'expense', 'iuran', 'reset'].includes(parsed.type)) {
                throw new Error('Invalid transaction type');
            }
            
            return {
                success: true,
                data: {
                    type: parsed.type,
                    amount: parsed.amount || 0,
                    student_id: parsed.student_id || null,
                    student_name: parsed.student_name || null,
                    description: parsed.description || '',
                    confidence: parsed.confidence || 0.5
                }
            };
            
        } catch (error) {
            console.error('Error parsing AI response:', error.message);
            return { success: false, error: 'Failed to parse AI response' };
        }
    }

    async findBestMatch(searchName, studentsList) {
        if (!this.apiKey || !searchName || !studentsList.length) {
            return null;
        }

        try {
            const prompt = `
Cari nama siswa yang paling cocok dengan: "${searchName}"

Daftar siswa:
${studentsList.map(s => `- ${s.name} (ID: ${s.id})`).join('\n')}

Berikan response dalam format JSON:
{
    "best_match": {
        "id": number,
        "name": "string",
        "confidence": 0.0-1.0
    }
}

Jika tidak ada yang cocok, set confidence < 0.5`;

            const response = await axios.post(this.baseURL, {
                model: this.model,
                messages: [
                    {
                        role: 'system',
                        content: 'Kamu adalah sistem pencarian nama yang akurat. Berikan response dalam format JSON yang valid.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: 200,
                temperature: 0.1
            }, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            const aiResponse = response.data.choices[0].message.content;
            const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
            
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                if (parsed.best_match && parsed.best_match.confidence >= 0.5) {
                    return parsed.best_match;
                }
            }
            
            return null;
            
        } catch (error) {
            console.error('Error finding best match:', error.message);
            return null;
        }
    }

    // Helper method for making API requests
    async makeRequest(requestData) {
        try {
            const response = await axios.post(this.baseURL, requestData, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 15000
            });

            return response;

        } catch (error) {
            throw error;
        }
    }
}

module.exports = MistralAI;
