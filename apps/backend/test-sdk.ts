
import { LingoDotDevEngine } from 'lingo.dev/sdk';

const apiKey = 'api_tfa4dszni6cjr6ezebork5k5';

async function testSdk() {
    console.log('Testing Lingo.dev SDK...');
    try {
        const lingo = new LingoDotDevEngine({ apiKey });
        const result = await lingo.localizeText('Hello world', {
            sourceLocale: 'en',
            targetLocale: 'es'
        });
        console.log('✅ SDK Result:', result);
    } catch (e) {
        console.error('❌ SDK Failed:', e.message);
    }
}

testSdk();
