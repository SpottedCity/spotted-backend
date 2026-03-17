export interface JwtPayload {
  sub: string; // user id
  email: string;
}

export interface SignUpDto {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface SignInDto {
  email: string;
  password: string;
}

export interface GoogleAuthDto {
  googleId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
}

export interface AuthResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
  };
}
