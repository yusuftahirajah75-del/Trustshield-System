const { query } = require("../config/database");

const createUser = async ({
  firstName,
  lastName,
  email,
  passwordHash,
  role
}) => {
  const sql = `
    INSERT INTO users (
      first_name,
      last_name,
      email,
      password_hash,
      role
    )
    VALUES ($1, $2, $3, $4, $5)
    RETURNING
      id,
      first_name,
      last_name,
      email,
      role,
      is_active,
      created_at,
      updated_at
  `;

  const values = [
    firstName,
    lastName,
    email,
    passwordHash,
    role
  ];

  const result = await query(sql, values);

  return result.rows[0];
};

const findUserByEmail = async (email) => {
  const sql = `
    SELECT
      id,
      first_name,
      last_name,
      email,
      password_hash,
      role,
      is_active,
      created_at,
      updated_at
    FROM users
    WHERE email = $1
    LIMIT 1
  `;

  const result = await query(sql, [email]);

  return result.rows[0] || null;
};

const findUserById = async (id) => {
  const sql = `
    SELECT
      id,
      first_name,
      last_name,
      email,
      role,
      is_active,
      created_at,
      updated_at
    FROM users
    WHERE id = $1
    LIMIT 1
  `;

  const result = await query(sql, [id]);

  return result.rows[0] || null;
};

module.exports = {
  createUser,
  findUserByEmail,
  findUserById
};