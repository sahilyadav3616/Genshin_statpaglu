const STATPAGLU_QUOTES=[["“The world remains constant over the centuries. But human life is like the dew at dawn or a bubble rising through water. Transitory.”","Raiden Shogun — The Mortal World"],["“People say that the moon shines brightest on a moonless night.”","Yae Miko — The Moon"],["“The wind rises with a gust, and the clouds gather in response.”","Zhongli — About the Wind"],["“The rain stops, the wind dies down, and the sun comes out.”","Nahida — The Rain"],["“Every journey has its final day. Don’t rush.”","Zhongli — The Journey"],["“What does freedom really mean, if demanded of you by a god?”","Venti — About Freedom"]];
(function(){
  const quote=STATPAGLU_QUOTES[Math.floor(Math.random()*STATPAGLU_QUOTES.length)];
  const text=document.querySelector('#voiceQuote');
  const author=document.querySelector('#voiceAttribution');
  if(text) text.textContent=quote[0];
  if(author) author.textContent=quote[1];
})();
