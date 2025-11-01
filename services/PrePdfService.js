// services/PDFService.js
const PDFDocument = require('pdfkit');

class PDFService {
  static generatePreApprovalLetter(preApproval) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument();
        const buffers = [];
        
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfData = Buffer.concat(buffers);
          resolve(pdfData);
        });
        
        // Add letterhead and content
        this.addLetterhead(doc);
        this.addPreApprovalContent(doc, preApproval);
        
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
  
  static addLetterhead(doc) {
    // Add your mortgage company logo and header
    doc.fontSize(20).text('MORTGAGE COMPANY NAME', 100, 100);
    doc.fontSize(12).text('123 Main Street, City, State 12345', 100, 130);
    doc.moveDown(2);
  }
  
  static addPreApprovalContent(doc, preApproval) {
    doc.fontSize(16).text('MORTGAGE PRE-APPROVAL LETTER', { underline: true });
    doc.moveDown();
    
    doc.fontSize(12)
       .text(`Dear Home Buyer,`)
       .moveDown()
       .text(`We are pleased to inform you that you have been pre-approved for a mortgage loan with the following terms:`)
       .moveDown()
       .text(`Maximum Purchase Price: $${preApproval.maxPurchasePrice.toLocaleString()}`)
       .text(`Down Payment Required: $${preApproval.downPaymentRequired.toLocaleString()}`)
       .text(`Estimated Monthly Payment: $${preApproval.monthlyPayment.toLocaleString()}`)
       .text(`Loan Amount: $${preApproval.loanAmount.toLocaleString()}`)
       .text(`Interest Rate: ${(preApproval.interestRate * 100).toFixed(2)}%`)
       .moveDown()
       .text(`This pre-approval is valid until: ${preApproval.expirationDate.toLocaleDateString()}`)
       .moveDown()
       .text(`Conditions:`)
       .text(`- Subject to final underwriting approval`)
       .text(`- Property must meet lending criteria`)
       .text(`- No significant changes to financial profile`)
       .moveDown()
       .text(`Sincerely,`)
       .moveDown()
       .text(`Mortgage Lender`)
       .text(`Licensed Mortgage Broker`);
  }
}

module.exports = PDFService;