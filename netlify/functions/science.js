exports.handler = async (event) => {
  const sciences = JSON.parse(event.body);
    console.log(sciences)
  if (!sciences.name || !sciences.role) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Il manque le nom ou le role !' })
    };
  }
 
  console.log('sciences reçu via Background Sync :', sciences);
 
  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'sciences bien reçu !' })
  };
};