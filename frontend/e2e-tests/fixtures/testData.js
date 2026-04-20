/**
 * Test data for E2E tests.
 * Seeded users come from DataInitializer (doctors: doctor123, patients: password).
 * Admin account is created separately.
 */
const ts = Date.now();

const testUsers = {
  /** Pre-seeded patient used across all patient tests */
  patient: {
    username: 'patient1',
    password: 'password',
  },

  /** Pre-seeded doctor */
  doctor: {
    username: 'dr_sharma',
    password: 'doctor123',
  },

  /** Admin account */
  admin: {
    username: 'admin',
    password: 'adminpass',
  },

  /** Fresh patient registered during the auth test suite */
  newPatient: {
    username: `e2e_pat_${ts}`,
    email: `e2e_pat_${ts}@test.com`,
    password: 'Test1234',
    role: 'PATIENT',
  },
};

const testAppointment = {
  symptoms: `E2E test – chest pain and shortness of breath (${ts})`,
  /** Returns tomorrow's date in YYYY-MM-DD format */
  date() {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  },
};

module.exports = { testUsers, testAppointment };
