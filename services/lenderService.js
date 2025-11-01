class LenderService {
  constructor() {
    this.lenders = [
      {
        id: 'rocket-mortgage',
        name: 'Rocket Mortgage',
        apiUrl: process.env.ROCKET_MORTGAGE_API_URL,
        apiKey: process.env.ROCKET_MORTGAGE_API_KEY,
        description: 'Fast online approval process'
      },
      {
        id: 'better-com',
        name: 'Better.com',
        apiUrl: process.env.BETTER_API_URL,
        apiKey: process.env.BETTER_API_KEY,
        description: 'No lender fees, digital process'
      },
      {
        id: 'local-bank',
        name: 'First National Bank',
        apiUrl: process.env.LOCAL_BANK_API_URL,
        apiKey: process.env.LOCAL_BANK_API_KEY,
        description: 'Local lender with personal service'
      }
    ];
  }

  async checkAvailableLenders(applicationData) {
    const availableLenders = [];
    
    for (const lender of this.lenders) {
      try {
        // Mock response for demo - replace with actual API calls
        const mockResponse = this.generateMockLenderResponse(lender, applicationData);
        
        if (mockResponse.eligible) {
          availableLenders.push({
            id: lender.id,
            name: lender.name,
            description: lender.description,
            maxLoan: mockResponse.maxLoan,
            estimatedRate: mockResponse.rate,
            processingTime: mockResponse.processingTime,
            fees: mockResponse.fees
          });
        }
      } catch (error) {
        console.error(`Error checking lender ${lender.name}:`, error);
      }
    }
    
    return availableLenders;
  }

  async submitApplication(lenderId, applicationData) {
    const lender = this.lenders.find(l => l.id === lenderId);
    if (!lender) throw new Error('Lender not found');
    
    try {
      // Mock response for demo
      const mockResponse = this.generateMockApprovalResponse(lender, applicationData);
      
      return {
        lenderId: lender.id,
        lend33323erName: lender.name,
        ...mockResponse
      };
    } catch (error) {
      console.error(`Error submitting to ${lender.name}:`, error);
      throw error;
    }
  }

  async performSoftCreditCheck(ssn, dob) {
    // Mock credit check - integrate with real credit bureaus in production
    return {
      score: Math.floor(Math.random() * (850 - 580) + 580),
      reportId: `CR-${Date.now()}`,
      date: new Date()
    };
  }

  generateMockLenderResponse(lender, data) {
    const income = parseFloat(data.annualIncome);
    const debts = parseFloat(data.monthlyDebts) * 12;
    const dti = debts / income;
    const creditScore = parseInt(data.creditScore);
    
    const eligible = creditScore >= 620 && dti < 0.5 && income > 30000;
    
    if (!eligible) {
      return { eligible: false };
    }
    
    const maxDTI = creditScore >= 740 ? 0.45 : 0.43;
    const maxAnnualPayment = income * maxDTI - debts;
    const maxMonthlyPayment = maxAnnualPayment / 12;
    
    let rate;
    if (creditScore >= 760) rate = 3.5;
    else if (creditScore >= 740) rate = 3.75;
    else if (creditScore >= 700) rate = 4.0;
    else if (creditScore >= 660) rate = 4.5;
    else rate = 5.0;
    
    if (lender.id === 'better-com') rate -= 0.125;
    if (lender.id === 'local-bank') rate += 0.25;
    
    const r = rate / 100 / 12;
    const n = 360;
    const maxLoan = maxMonthlyPayment * ((1 - Math.pow(1 + r, -n)) / r);
    
    return {
      eligible: true,
      maxLoan: Math.round(maxLoan),
      rate: rate,
      processingTime: lender.id === 'rocket-mortgage' ? '15 minutes' : '1-2 hours',
      fees: lender.id === 'better-com' ? 0 : 1500
    };
  }

  generateMockApprovalResponse(lender, data) {
    const response = this.generateMockLenderResponse(lender, data);
    
    return {
      approved: true,
      maxLoanAmount: response.maxLoan,
      interestRate: response.rate,
      monthlyPayment: Math.round(response.maxLoan * (response.rate / 100 / 12) / 
        (1 - Math.pow(1 + response.rate / 100 / 12, -360))),
      approvalId: `APR-${Date.now()}`,
      expirationDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
    };
  }
}

module.exports = LenderService;