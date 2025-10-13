exports.getUser = async (req, res) => {
  res.json({
    message: 'Authorized Route',
    uid: req.uid,
  });
};
