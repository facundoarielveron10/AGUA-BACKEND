import jwt from "jsonwebtoken";

type UserPayload = {
    id: number;
    confirmed: boolean;
};

export const generateJWT = async (payload: UserPayload) => {
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: "1d",
    });

    return token;
};
