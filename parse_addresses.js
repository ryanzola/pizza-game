const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const dataDir = path.join(__dirname, 'services', 'web', 'src', 'data');
const outputFile = path.join(__dirname, 'services', 'web', 'src', 'data', 'addresses.json');

const towns = ['hasbrouck_heights', 'lodi', 'wood_ridge'];
const addressData = {};

let processedCount = 0;

towns.forEach(town => {
  addressData[town] = {};
  const townFile = path.join(dataDir, `${town}.csv`);

  if (!fs.existsSync(townFile)) {
    console.error(`File not found: ${townFile}`);
    processedCount++;
    return;
  }

  fs.createReadStream(townFile)
    .pipe(csv())
    .on('data', (row) => {
      const street = row['Street'];
      const rangeStr = row['Address Range'];

      if (street && rangeStr) {
        // Parse the comma-separated string of numbers into an array of integers
        const numbers = rangeStr.split(',').map(n => parseInt(n.trim(), 10)).filter(n => !isNaN(n));
        if (numbers.length > 0) {
          addressData[town][street.trim()] = numbers;
        }
      }
    })
    .on('end', () => {
      processedCount++;
      if (processedCount === towns.length) {
        fs.writeFileSync(outputFile, JSON.stringify(addressData, null, 2));
        console.log(`Successfully generated ${outputFile}`);
      }
    });
});
