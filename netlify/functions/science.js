exports.handler = async (event) => {
  const science = JSON.parse(event.body);
 
  if (!science.name || !science.mood) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Il manque le nom ou l’humeur !' })
    };
  }
 
  console.log('science reçu via Background Sync :', science);
 
  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'science bien reçu !' })
  };
};