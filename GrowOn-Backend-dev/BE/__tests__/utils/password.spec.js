/* eslint-disable no-undef */
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { getHash, genJwtToken } from '../../utils/password';

describe('password util', () => {
	const pass = 'password123';
	const id = 'userId';

	it('should return hashed password', async () => {
		jest.spyOn(bcrypt, 'genSalt').mockResolvedValueOnce('saltedPassword');
		jest.spyOn(bcrypt, 'hash').mockResolvedValueOnce('hashedPassword');
		await getHash(pass);
		expect(bcrypt.genSalt).toHaveBeenCalledWith(10);
		expect(bcrypt.hash).toHaveBeenCalledWith(pass, 'saltedPassword');
	});
	it('should return jwt token', () => {
		jest.spyOn(jwt, 'sign').mockResolvedValueOnce('jwt_Token');
		genJwtToken(id);
		expect(jwt.sign).toHaveBeenCalledWith({ id: 'userId' }, undefined, {
			expiresIn: '60d',
		});
	});
});
