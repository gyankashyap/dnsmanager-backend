const route53 = require('../config/awsConfig');
const fs = require('fs');
const csv = require('csv-parser');

exports.getAllHostedZones = async (req, res) => {
  try {
    const hostedZones = await route53.listHostedZones().promise();
    const zoneDetails = await Promise.all(
      hostedZones.HostedZones.map(async (zone) => {
        const records = await getDNSRecordsForZone(zone.Id);
        return {
          zone,
          records
        };
      })
    );
    res.json(zoneDetails);
  } catch (error) {
    console.error('Error fetching hosted zones:', error);
    res.status(500).json({ error: 'Failed to fetch hosted zones' });
  }
};

exports.createDNSRecord = async (req, res) => {
  const {zoneId, Name, Type, TTL, ResourceRecords } = req.body;

  if (!zoneId) {

    return res.status(400).json({ error: 'zoneId is required' });

  }
  const params = {
    ChangeBatch: {
      Changes: [
        {
          Action: 'CREATE',
          ResourceRecordSet: {
            Name: Name,
            Type: Type,
            TTL: TTL || 300,
            ResourceRecords: ResourceRecords,
          },
        },
      ],
    },
    HostedZoneId: zoneId,
  };

  try {
    const data = await route53.changeResourceRecordSets(params).promise();
    res.json(data);
  } catch (error) {
    console.error('Error creating DNS record:', error);
    res.status(500).json({ error: 'Failed to create DNS record' });
  }
};


const getDNSRecordsForZone = async (hostedZoneId) => {
  const params = {
    HostedZoneId: hostedZoneId
  };
  try {
    const recordSets = await route53.listResourceRecordSets(params).promise();
    return recordSets.ResourceRecordSets;
  } catch (error) {
    console.error(`Error fetching records for zone ${hostedZoneId}:`, error);
    throw error;
  }
};

exports.getDNSRecords = async (req, res) => {
  const { zoneId } = req.query; // Retrieve zoneId from query parameters
  const { token } = req.headers; // Extract the token from the request headers

  // Validate if the token exists
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  const params = { HostedZoneId: zoneId };
  console.log(zoneId);

  try {
    const data = await route53.listResourceRecordSets(params).promise();
    res.json(data);
  } catch (error) {
    console.error('Error retrieving DNS records:', error);
    res.status(500).json({ error: 'Failed to retrieve DNS records' });
  }
};

exports.updateDNSRecord = async (req, res) => {
  const { zoneId, Name, Type, TTL, ResourceRecords} = req.body;

  if (!zoneId) {

    return res.status(400).json({ error: 'zoneId is required' });

  }
  const params = {
    ChangeBatch: {
      Changes: [
        {
          Action: 'UPSERT',
          ResourceRecordSet: {
            Name: Name,
            Type: Type,
            TTL: TTL || 300,
            ResourceRecords: ResourceRecords,
          },
        },
      ],
    },
    HostedZoneId: zoneId,
  };

  try {
    const data = await route53.changeResourceRecordSets(params).promise();
    res.json(data);
  } catch (error) {
    console.error('Error updating DNS record:', error);
    res.status(500).json({ error: 'Failed to update DNS record' });
  }
};

exports.deleteDNSRecord = async (req, res) => {
  const { zoneId, Name, Type, TTL, ResourceRecords} = req.body;
  if (!zoneId) {

    return res.status(400).json({ error: 'ZoneId is required' });

  }
  const params = {
    ChangeBatch: {
      Changes: [
        {
          Action: 'DELETE',
          ResourceRecordSet: {
            Name: Name,
            Type: Type,
            TTL: TTL || 300,
            ResourceRecords: ResourceRecords,
          },
        },
      ],
    },
    HostedZoneId: zoneId,
  };

  try {
    const data = await route53.changeResourceRecordSets(params).promise();
    res.json(data);
  } catch (error) {
    console.error('Error deleting DNS record:', error);
    res.status(500).json({ error: 'Failed to delete DNS record' });
  }
};


exports.bulkUploadDNSRecords = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const { zoneId } = req.query;

  if (!zoneId) {

    return res.status(400).json({ error: 'ZoneId is required' });

  }  
  const results = [];
  const filePath = req.file.path;

  fs.createReadStream(filePath)
    .pipe(csv())
    .on('data', async (data) => {
      const params = {
        ChangeBatch: {
          Changes: [
            {
              Action: 'CREATE',
              ResourceRecordSet: {
                Name: data.name,
                Type: data.type,
                TTL: data.ttl || 300,
                ResourceRecords: [{ Value: data.value }],
              },
            },
          ],
        },
        HostedZoneId: zoneId,
      };

      try {
        const result = await route53.changeResourceRecordSets(params).promise();
        results.push(result);
      } catch (error) {
        console.error(`Error creating DNS record for ${data.name}:`, error);
        results.push({ error: `Failed to create DNS record for ${data.name}` });
      }
    })
    .on('end', () => {
      res.json(results);
      fs.unlinkSync(filePath); // Clean up the uploaded file
    })
    .on('error', (error) => {
      console.error('Error processing CSV file:', error);
      res.status(500).json({ error: 'Failed to process CSV file' });
    });
};
