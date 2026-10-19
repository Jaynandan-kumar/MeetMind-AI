import axios from "axios"

export const deductCredits = async ({ userId, amount, credits }) => {
    try {
        const deductAmt = amount !== undefined ? amount : (credits !== undefined ? credits : 10)
        const { data } = await axios.post(`${process.env.AUTH_SERVICE}/user/deduct-credits`, {
            userId,
            amount: deductAmt,
            credits: deductAmt
        })
        return data
    } catch (error) {
        console.log("deduct credits error", error)
        return null
    }
}
