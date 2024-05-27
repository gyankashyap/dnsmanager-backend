const express = require('express');
const {
  createDNSRecord,
  getDNSRecords,
  updateDNSRecord,
  deleteDNSRecord,
  bulkUploadDNSRecords,
  getAllHostedZones
} = require('../controllers/dnsController');
const authenticateUser = require('../middleware/authMiddleware');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

const router = express.Router();

router.get('/hosted-zones', authenticateUser, getAllHostedZones);
router.post('/record', authenticateUser, createDNSRecord);
router.get('/records', authenticateUser, getDNSRecords);
router.put('/record', authenticateUser, updateDNSRecord);
router.delete('/record', authenticateUser, deleteDNSRecord);
router.post('/bulk-upload', authenticateUser, upload.single('file'), bulkUploadDNSRecords);

module.exports = router;
