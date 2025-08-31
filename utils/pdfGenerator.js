const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class PDFGenerator {
  constructor() {
    this.doc = new PDFDocument({
      size: 'LETTER',
      margins: {
        top: 72,
        bottom: 72,
        left: 72,
        right: 72
      }
    });
  }
  
  generateLOI(formData, outputPath) {
    return new Promise((resolve, reject) => {
      const stream = fs.createWriteStream(outputPath);
      this.doc.pipe(stream);
      
      // Add all content sections (only using methods that exist)
      this.addHeader(formData);
      this.addSalutation(formData);
      this.addPropertyDescription(formData);
      this.addPriceSection(formData);
      this.addPossessionSection(formData);
      this.addInspectionSection(formData);
      this.addConditionsSection(formData);
      this.addWarrantiesSection(formData);
      this.addStandardProvisions(formData);
      this.addStandStillSection(formData);
      this.addNonBindingSection(formData);
      this.addConfidentialitySection(formData);
      this.addClosing(formData);
      this.addSignatureSection(formData);
      
      // Finalize
      this.doc.end();
      
      stream.on('finish', () => resolve(outputPath));
      stream.on('error', reject);
    });
  }
  
  addHeader(formData) {
    // Buyer address on top right
    this.doc
      .fontSize(11)
      .font('Helvetica')
      .text(`${formData.buyerName || 'Buyer Name'}`, 400, 50, { align: 'right' })
      .text(`${formData.buyerAddress || 'Buyer Address'}`, 400, 65, { align: 'right' })
      .text(`${formData.buyerCity || 'City'}, ${formData.buyerState || 'State'} ${formData.buyerZip || 'ZIP'}`, 400, 80, { align: 'right' });
    
    // Date
    this.doc
      .text(`${this.formatDate(formData.letterDate)}`, 72, 120);
    
    // Seller address
    this.doc
      .text(`${formData.sellerName || 'Seller Name'}`, 72, 140)
      .text(`${formData.sellerAddress || 'Seller Address'}`, 72, 155)
      .text(`${formData.sellerCity || 'City'}, ${formData.sellerState || 'State'} ${formData.sellerZip || 'ZIP'}`, 72, 170);
    
    // Salutation
    this.doc
      .moveDown(2)
      .text(`Dear ${formData.sellerName ? formData.sellerName.split(' ')[0] : 'Seller'}:`, 72, 220);
  }
  
  addSalutation(formData) {
    this.doc
      .moveDown()
      .fontSize(11)
      .text('The purpose of this letter is to set forth some of the basic terms and conditions of the proposed purchase by the undersigned (the "Buyer") of certain real estate owned by you (the "Seller"). The terms set forth in this Letter will not become binding until a more detailed "Purchase Agreement" is negotiated and signed by the parties, as contemplated below by the section of this Letter entitled "Non-Binding."', {
        align: 'justify',
        indent: 0
      });
  }
  
  addPropertyDescription(formData) {
    this.doc
      .moveDown()
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('1. DESCRIPTION OF PROPERTY.')
      .fontSize(11)
      .font('Helvetica')
      .text(`The property proposed to be sold is located at ${formData.propertyAddress || 'Property Address'}, ${formData.propertyCity || 'City'}, ${formData.propertyState || 'State'} and is legally described as ${formData.legalDescription || 'See attached exhibit'}.`, {
        align: 'justify'
      })
      .moveDown(0.5)
      .text('The Real Estate is subject to public highways, covenants, restrictions and zoning, if any.')
      .moveDown(0.5);
    
    if (formData.includedItems || formData.excludedItems) {
      this.doc.text('Included are all permanent fixtures and all property that integrally belongs to or is part of the Real Estate, whether attached or detached, such as light fixtures, shades, rods, blinds, awnings, windows, storm doors, screens, plumbing fixtures, water heater, water softener, air conditioning equipment, built-in items, outside television antenna, fencing, gates and landscaping,');
      
      if (formData.includedItems) {
        this.doc.text(`specifically including ${formData.includedItems},`);
      }
      
      if (formData.excludedItems) {
        this.doc.text(`but specifically excluding ${formData.excludedItems}.`);
      }
    }
  }
  
  addPriceSection(formData) {
    this.doc
      .moveDown()
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('2. PRICE.')
      .fontSize(11)
      .font('Helvetica')
      .text(`The proposed purchase price is ${this.formatCurrency(formData.purchasePrice)}, of which ${this.formatCurrency(formData.depositAmount)} would be deposited with Seller, or Seller's agent, upon acceptance of a binding Purchase Agreement. Buyer would pay the balance to Seller at closing.`, {
        align: 'justify'
      });
  }
  
  addPossessionSection(formData) {
    this.doc
      .moveDown()
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('3. POSSESSION.')
      .fontSize(11)
      .font('Helvetica')
      .text(`Possession would be given on ${this.formatDate(formData.possessionDate)}, or sooner by mutual agreement. Settlement would be made at the closing, immediately prior to possession.`, {
        align: 'justify'
      });
  }
  
  addInspectionSection(formData) {
    this.doc
      .moveDown()
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('4. INSPECTION.')
      .fontSize(11)
      .font('Helvetica')
      .text('After the final acceptance of a binding Purchase Agreement, Buyer may have the Real Estate inspected by a person of Buyer\'s choice to determine if there are any structural, mechanical, plumbing or electrical deficiencies, structural pest damage or infestation, any unsafe conditions or other damage, including the presence of radon gas, any lead-based paint hazards, and inspections for other conditions that are customary to the locality and/or that are required by law.', {
        align: 'justify'
      });
  }
  
  addConditionsSection(formData) {
    this.doc
      .moveDown()
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('5. CONDITIONS.')
      .fontSize(11)
      .font('Helvetica')
      .text('Buyer\'s obligations under the Purchase Agreement would be subject to:', {
        align: 'justify'
      })
      .moveDown(0.5);
    
    if (formData.requireFinancing === 'yes') {
      this.doc
        .text(`a. Receipt by Buyer of financing, in the amount of ${this.formatCurrency(formData.financingAmount)}, and at an interest rate not to exceed ${formData.interestRate}%, financed over a period of ${formData.financingYears} years or more, to finance Buyer's purchase of the Real Estate.`, {
          indent: 20
        });
    }
    
    if (formData.saleContingency === 'yes') {
      this.doc
        .text('b. Sale of Buyer\'s current property.', {
          indent: 20
        });
    }
    
    if (formData.additionalConditions) {
      this.doc
        .text(`c. ${formData.additionalConditions}`, {
          indent: 20
        });
    }
    
    this.doc
      .moveDown(0.5)
      .text(`Buyer would agree to satisfy or release such condition(s) by ${this.formatDate(formData.conditionsDate)}.`, {
        align: 'justify'
      });
  }
  
  addWarrantiesSection(formData) {
    this.doc
      .moveDown()
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('6. SELLER\'S WARRANTIES.')
      .fontSize(11)
      .font('Helvetica')
      .text('Seller warrants that the title of the proposed property to be sold is and shall be good. Good title consists of Seller\'s actual possession of the property, Seller\'s right of possession of the property, and Seller\'s right of property. Buyer is responsible for performing any title search or other due diligence investigation of title as may be appropriate, and may withdraw from a binding Purchase Agreement if it is discovered that Seller does not have good title.', {
        align: 'justify'
      })
      .moveDown(0.5)
      .text(`Seller shall deliver title to the property to Buyer in the form of a ${formData.deedType === 'warranty' ? 'Warranty' : 'Special Warranty'} Deed.`, {
        align: 'justify'
      });
  }
  
  addStandardProvisions(formData) {
    this.doc
      .moveDown()
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('7. STANDARD PROVISIONS.')
      .fontSize(11)
      .font('Helvetica')
      .text('The Purchase Agreement will include the standard provisions that are customary to the locality and/or that are required by law.', {
        align: 'justify'
      });
  }
  
  addStandStillSection(formData) {
    this.doc
      .moveDown()
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('8. STAND STILL.')
      .fontSize(11)
      .font('Helvetica')
      .text(`Seller shall not initiate or carry on negotiations for the sale of the Real Estate with any party other than Buyer unless either (1) Buyer and Seller fail to enter into a binding Purchase Agreement by ${this.formatDate(formData.standStillEndDate)}, or (2) Buyer and Seller agree in writing to abandon this Letter of Intent.`, {
        align: 'justify'
      });
  }
  
  addNonBindingSection(formData) {
    this.doc
      .moveDown()
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('9. NON-BINDING.')
      .fontSize(11)
      .font('Helvetica')
      .text('This Letter of Intent does not, and is not intended to, contractually bind the parties, and is only an expression of the basic conditions to be incorporated into a binding Purchasing Agreement. This Letter of Intent does not address all of the essential terms of any potential Purchase Agreement. This Letter does not require either party to negotiate in good faith or to proceed to the completion of a binding Purchase Agreement. The parties shall not be contractually bound unless and until they enter into a formal, written Purchase Agreement, which must be in form and content satisfactory to each party and to each party\'s legal counsel, in their sole discretion. Neither party may rely on this Letter as creating any legal obligation of any kind; neither party has taken or will take any action in reliance on this non-binding Letter of Intent, whether a contract claim, a claim for reliance or estoppel (such as a claim for out-of-pocket expenses incurred by a party), or a claim for breach of any obligation to negotiate in good faith. Notwithstanding the provisions of this paragraph to the contrary, Seller and Buyer agree that the above paragraph entitled "Stand Still" shall be binding, regardless of whether a binding Purchase Agreement is entered into by the parties.', {
        align: 'justify'
      });
  }
  
  addConfidentialitySection(formData) {
    this.doc
      .moveDown()
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('10. CONFIDENTIALITY.')
      .fontSize(11)
      .font('Helvetica')
      .text('Buyer and Seller agree to make good faith efforts to hold any pricing terms, negotiations, and any other confidential information in confidence and will not disclose this information to any person or entity without prior written consent from either party.', {
        align: 'justify'
      });
  }
  
  addClosing(formData) {
    this.doc
      .moveDown(2)
      .text('If you would like to discuss a sale of the Real Estate with the undersigned on these general terms, please sign and return a copy of this Letter of Intent to the undersigned at your earliest convenience.')
      .moveDown(2)
      .text('Sincerely,')
      .moveDown(2);
  }
  
  addSignatureSection(formData) {
    this.doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('BUYER:')
      .moveDown(2)
      .fontSize(11)
      .font('Helvetica')
      .text('By: _________________________________', 72, this.doc.y)
      .text('Date: ___________________', 300, this.doc.y)
      .moveDown(0.5)
      .text(formData.buyerName || 'Buyer Name', 100, this.doc.y)
      .moveDown(3)
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('SELLER:')
      .moveDown(2)
      .fontSize(11)
      .font('Helvetica')
      .text('By: _________________________________', 72, this.doc.y)
      .text('Date: ___________________', 300, this.doc.y)
      .moveDown(0.5)
      .text(formData.sellerName || 'Seller Name', 100, this.doc.y)
      .moveDown(2)
      .text('The above Letter reflects our mutual understanding and sets forth the basis for proceeding to negotiate a Purchase Agreement as outlined above.');
  }
  
  formatDate(dateStr) {
    if (!dateStr) return '[DATE]';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return '[INVALID DATE]';
    }
    return date.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
  }
  
  formatCurrency(amount) {
    if (!amount) return '$0.00';
    const numericAmount = typeof amount === 'string' 
      ? parseFloat(amount.replace(/[^0-9.-]+/g, '')) 
      : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(numericAmount);
  }
}

module.exports = PDFGenerator;