const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class PDFService {
  generatePreApprovalLetter(approval, user) {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument();
      const filename = `pre-approval-${approval.referenceNumber}.pdf`;
      const filepath = path.join(__dirname, '../temp', filename);
      
      if (!fs.existsSync(path.join(__dirname, '../temp'))) {
        fs.mkdirSync(path.join(__dirname, '../temp'), { recursive: true });
      }
      
      const stream = fs.createWriteStream(filepath);
      doc.pipe(stream);
      
      // Header
      doc.fontSize(20)
         .font('Helvetica-Bold')
         .text(approval.lenderName, 50, 50)
         .fontSize(12)
         .font('Helvetica')
         .text('Pre-Approval Letter', 50, 80);
      
      // Date and Reference
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 50, 120);
      doc.text(`Reference: ${approval.referenceNumber}`, 50, 140);
      
      // Letter Body
      doc.moveDown(2);
      doc.fontSize(11)
         .text('To Whom It May Concern:', 50);
      
      doc.moveDown();
      doc.text(
        `This letter confirms that ${user.firstName} ${user.lastName} has been pre-approved ` +
        `for a mortgage loan through ${approval.lenderName}.`,
        50,
        doc.y,
        { align: 'justify', width: 500 }
      );
      
      doc.moveDown();
      doc.text('Pre-Approval Details:', 50);
      doc.moveDown(0.5);
      
      // Details
      const details = [
        ['Maximum Loan Amount:', `$${parseFloat(approval.maxLoanAmount).toLocaleString()}`],
        ['Down Payment:', `$${parseFloat(approval.downPayment).toLocaleString()}`],
        ['Maximum Purchase Price:', `$${(parseFloat(approval.maxLoanAmount) + parseFloat(approval.downPayment)).toLocaleString()}`],
        ['Interest Rate:', `${approval.interestRate}% (estimated)`],
        ['Buyer Rating:', approval.buyerRating],
        ['Valid Until:', new Date(approval.expiresAt).toLocaleDateString()]
      ];
      
      let yPosition = doc.y;
      details.forEach(([label, value]) => {
        doc.text(label, 70, yPosition);
        doc.text(value, 250, yPosition);
        yPosition += 20;
      });
      
      // Disclaimer
      doc.moveDown(3);
      doc.fontSize(9)
         .text(
          'This pre-approval is based on the information provided and is subject to verification ' +
          'of all information, satisfactory property appraisal, and other standard underwriting conditions.',
          50,
          doc.y,
          { align: 'justify', width: 500 }
        );
      
      // Signature
      doc.moveDown(3);
      doc.fontSize(11)
         .text('Sincerely,', 50);
      doc.moveDown(2);
      doc.text('Loan Officer', 50);
      doc.text(approval.lenderName, 50);
      
      doc.end();
      
      stream.on('finish', () => {
        resolve(filepath);
      });
      
      stream.on('error', reject);
    });
  }
}

module.exports = PDFService;