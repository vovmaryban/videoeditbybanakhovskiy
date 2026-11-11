import { setupWhisper } from './whisper';

setupWhisper()
  .then(() => { console.log('\nРозпізнавання мови готове.'); process.exit(0); })
  .catch((e) => { console.error('\nПомилка:', e.message); process.exit(1); });
