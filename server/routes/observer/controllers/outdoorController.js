exports.outdoorplanUpload = async (req, res) => {

  try {
    let result = {
      message: 'fail',
      file: null
    };
    if(req.file) {
      result.message = 'ok';
      result.file = req.file;
      return res.status(200).send(result);
    }
    return res.status(400).send(result);
  } catch (error) {
    logger.info('observer/outdoorController.js, outdoorplanUpload, error: ', error);
    console.log('observer/outdoorController.js, outdoorplanUpload, error: ', error);
    return res.status(500).send({
      message: error.message || 'observer/outdoorController.js, outdoorplanUpload, error'
    });
  }
}