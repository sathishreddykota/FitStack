require('dotenv').config({path: '.env.local'});
fetch('https://generativelanguage.googleapis.com/v1beta/models?key=' + process.env.GEMINI_API_KEY)
  .then(res => res.json())
  .then(data => {
    if (data.models) console.log(data.models.map(m => m.name).join('\n'));
    else console.log(data);
  })
  .catch(console.error);
