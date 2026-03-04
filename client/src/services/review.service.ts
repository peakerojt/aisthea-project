import axios from "axios";

const API_URL = "http://localhost:5000/api/reviews";

export const getReviewsByProduct = async (productId: number) => {
    const res = await axios.get(`${API_URL}/product/${productId}`);
    return res.data;
};

export const createReview = async (data: {
    productId: number;
    userId: number;
    rating: number;
    comment: string;
}) => {
    const res = await axios.post(API_URL, data);
    return res.data;
};