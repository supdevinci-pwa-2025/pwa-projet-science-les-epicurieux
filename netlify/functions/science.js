exports.handler = async (event) => {
  const science = JSON.parse(event.body);
    console.log(science)
  if (!science.name || !science.role) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Il manque le nom ou le role !' })
    };
  }
 
  console.log('science reçu via Background Sync :', science);
 
  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'science bien reçu !' })
  };
};