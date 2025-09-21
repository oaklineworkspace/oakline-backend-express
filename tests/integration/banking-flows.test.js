
import { supabaseAdmin } from '../../lib/supabaseClient.js';
import { DoubleEntryLedger } from '../../lib/ledger/doubleEntry.js';

describe('Banking Integration Tests', () => {
  let testUser;
  let testAccounts;

  beforeEach(async () => {
    // Setup test user and accounts
    testUser = await createTestUser();
    testAccounts = await createTestAccounts(testUser.id);
  });

  afterEach(async () => {
    // Cleanup test data
    await cleanupTestData(testUser.id);
  });

  describe('Account Creation Flow', () => {
    test('should create account with proper validation', async () => {
      const accountData = {
        userId: testUser.id,
        accountType: 'checking_account',
        initialDeposit: 100.00
      };

      const result = await createAccount(accountData);
      
      expect(result.success).toBe(true);
      expect(result.account.balance).toBe(100.00);
      expect(result.account.status).toBe('active');
    });

    test('should reject invalid account types', async () => {
      const accountData = {
        userId: testUser.id,
        accountType: 'invalid_type',
        initialDeposit: 100.00
      };

      await expect(createAccount(accountData)).rejects.toThrow('Invalid account type');
    });
  });

  describe('Transaction Processing', () => {
    test('should process transfer with double-entry bookkeeping', async () => {
      const transferData = {
        userId: testUser.id,
        fromAccountId: testAccounts.checking.id,
        toAccountId: testAccounts.savings.id,
        amount: 50.00,
        description: 'Test transfer',
        transactionType: 'internal_transfer'
      };

      const result = await DoubleEntryLedger.createTransaction(transferData);
      
      expect(result.success).toBe(true);
      expect(result.transactionId).toBeDefined();
      
      // Verify balances
      const checkingBalance = await DoubleEntryLedger.getAccountBalance(testAccounts.checking.id);
      const savingsBalance = await DoubleEntryLedger.getAccountBalance(testAccounts.savings.id);
      
      expect(checkingBalance).toBe(50.00); // 100 - 50
      expect(savingsBalance).toBe(50.00);  // 0 + 50
    });

    test('should prevent overdrafts', async () => {
      const transferData = {
        userId: testUser.id,
        fromAccountId: testAccounts.checking.id,
        toAccountId: testAccounts.savings.id,
        amount: 150.00, // More than available
        description: 'Overdraft test',
        transactionType: 'internal_transfer'
      };

      await expect(DoubleEntryLedger.createTransaction(transferData))
        .rejects.toThrow('Insufficient funds');
    });

    test('should ensure transaction idempotency', async () => {
      const transferData = {
        userId: testUser.id,
        fromAccountId: testAccounts.checking.id,
        toAccountId: testAccounts.savings.id,
        amount: 25.00,
        description: 'Idempotency test',
        transactionType: 'internal_transfer'
      };

      const result1 = await DoubleEntryLedger.createTransaction(transferData);
      
      // Attempt same transaction again with same ID
      await expect(
        DoubleEntryLedger.createTransaction({
          ...transferData,
          transactionId: result1.transactionId
        })
      ).rejects.toThrow('Transaction already exists');
    });
  });

  describe('Security Tests', () => {
    test('should validate user permissions', async () => {
      const otherUser = await createTestUser();
      
      const transferData = {
        userId: otherUser.id,
        fromAccountId: testAccounts.checking.id, // User doesn't own this account
        toAccountId: testAccounts.savings.id,
        amount: 25.00,
        description: 'Unauthorized access test',
        transactionType: 'internal_transfer'
      };

      await expect(DoubleEntryLedger.createTransaction(transferData))
        .rejects.toThrow('Unauthorized');
    });

    test('should sanitize SQL inputs', async () => {
      const maliciousInput = "'; DROP TABLE accounts; --";
      
      const accountData = {
        userId: testUser.id,
        accountType: maliciousInput,
        initialDeposit: 100.00
      };

      await expect(createAccount(accountData))
        .rejects.toThrow('Invalid account type');
    });
  });
});

// Helper functions
async function createTestUser() {
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: `test-${Date.now()}@example.com`,
    password: 'testPassword123!',
    email_confirm: true
  });
  
  if (error) throw error;
  return data.user;
}

async function createTestAccounts(userId) {
  // Implementation for creating test accounts
  return {
    checking: { id: 'test-checking-id', balance: 100.00 },
    savings: { id: 'test-savings-id', balance: 0.00 }
  };
}

async function cleanupTestData(userId) {
  // Implementation for cleaning up test data
  await supabaseAdmin.auth.admin.deleteUser(userId);
}
import { supabaseAdmin } from '../../lib/supabaseClient.js';
import { DoubleEntryLedger } from '../../lib/ledger/doubleEntry.js';

describe('Banking Flow Integration Tests', () => {
  let testUserId;
  let testAccountId;

  beforeEach(async () => {
    // Create test user and account
    const { data: user } = await supabaseAdmin.auth.admin.createUser({
      email: `test-${Date.now()}@test.com`,
      password: 'SecureTest123!',
      email_confirm: true
    });
    testUserId = user.user.id;

    const { data: account } = await supabaseAdmin
      .from('accounts')
      .insert({
        user_id: testUserId,
        account_type: 'checking',
        balance: 1000.00,
        status: 'active'
      })
      .select()
      .single();
    testAccountId = account.id;
  });

  afterEach(async () => {
    // Cleanup test data
    await supabaseAdmin.from('accounts').delete().eq('user_id', testUserId);
    await supabaseAdmin.auth.admin.deleteUser(testUserId);
  });

  test('Complete transfer flow with double-entry ledger', async () => {
    // Create second account for transfer
    const { data: toAccount } = await supabaseAdmin
      .from('accounts')
      .insert({
        user_id: testUserId,
        account_type: 'savings',
        balance: 500.00,
        status: 'active'
      })
      .select()
      .single();

    // Execute transfer
    const transferResult = await DoubleEntryLedger.createTransaction({
      userId: testUserId,
      fromAccountId: testAccountId,
      toAccountId: toAccount.id,
      amount: 100.00,
      description: 'Test transfer',
      transactionType: 'internal_transfer'
    });

    expect(transferResult.success).toBe(true);

    // Verify ledger entries
    const { data: ledgerEntries } = await supabaseAdmin
      .from('ledger_entries')
      .select('*')
      .eq('transaction_id', transferResult.transactionId);

    expect(ledgerEntries).toHaveLength(2);
    expect(ledgerEntries.find(e => e.debit_amount > 0)).toBeTruthy();
    expect(ledgerEntries.find(e => e.credit_amount > 0)).toBeTruthy();

    // Verify account balances
    const { data: updatedFromAccount } = await supabaseAdmin
      .from('accounts')
      .select('balance')
      .eq('id', testAccountId)
      .single();

    const { data: updatedToAccount } = await supabaseAdmin
      .from('accounts')
      .select('balance')
      .eq('id', toAccount.id)
      .single();

    expect(parseFloat(updatedFromAccount.balance)).toBe(900.00);
    expect(parseFloat(updatedToAccount.balance)).toBe(600.00);
  });

  test('Transaction idempotency protection', async () => {
    const transactionData = {
      userId: testUserId,
      fromAccountId: testAccountId,
      toAccountId: testAccountId,
      amount: 50.00,
      description: 'Idempotency test',
      transactionType: 'test_transaction'
    };

    // First transaction
    const result1 = await DoubleEntryLedger.createTransaction(transactionData);
    expect(result1.success).toBe(true);

    // Duplicate transaction should fail
    await expect(
      DoubleEntryLedger.createTransaction(transactionData)
    ).rejects.toThrow('Transaction already exists');
  });

  test('Insufficient funds protection', async () => {
    const { data: emptyAccount } = await supabaseAdmin
      .from('accounts')
      .insert({
        user_id: testUserId,
        account_type: 'checking',
        balance: 10.00,
        status: 'active'
      })
      .select()
      .single();

    await expect(
      DoubleEntryLedger.createTransaction({
        userId: testUserId,
        fromAccountId: emptyAccount.id,
        toAccountId: testAccountId,
        amount: 100.00,
        description: 'Insufficient funds test',
        transactionType: 'test_transfer'
      })
    ).rejects.toThrow('Insufficient funds');
  });
});
