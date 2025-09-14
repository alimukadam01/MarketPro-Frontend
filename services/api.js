
import axios from "axios";
import { 
    transformSalesInvoice,
    transformPurchaseInvoice
} from "./utils";

const BASE_URL = "http://localhost:8000/"

const apiClient = axios.create({
    baseURL: BASE_URL,
    headers: {
        "Content-Type": "application/json"
    },
    timeout: 30000
})

export const getProductsList = async (token) => {
    try {
        const res = await apiClient.get(`/products/`, {
            headers: {
                Authorization: token
            }
        })

        if (res.status === 200) {
            return res.data
        }

        console.log("There was an error fetching the product list.")
        return []
    } catch (error) {
        console.log("There was an error fetching the product list: ", error)
        return []
    }
}

export const getAvailableProductsList = async (token, businessId) => {
    try {
        const res = await apiClient.get(`/inventory/${businessId}/items/get_available_items/`, {
            headers: {
                Authorization: token
            }
        })

        if (res.status === 200) {
            console.log(res.data)
            return res.data
        }

        console.log("There was an error fetching the product list.")
        return []
    } catch (error) {
        console.log("There was an error fetching the product list: ", error)
        return []
    }
}

export const getCustomersList = async (token) => {
    try {
        const res = await apiClient.get("/customers/", {
            headers: {
                Authorization: token
            }
        })

        if (res.status === 200) {
            return res.data
        }

        console.log("There was an error fetching the customer list.")
        return []
    } catch (error) {
        console.log(error)
        return []
    }
}

export const getSuppliersList = async (token) => {
    try {
        const res = await apiClient.get("/suppliers/", {
            headers: {
                Authorization: token
            }
        })

        if (res.status === 200) {
            return res.data
        }

        console.log("There was an error fetching the supplier list.")
        return []
    } catch (error) {
        console.log(error)
        return []
    }
}

export const login = async (creds) => {

    try{
        const res = await apiClient.post("/auth/jwt/create/", creds)
        if (res.status === 200){
            localStorage.setItem("market-pro-access-token", `JWT ${ res.data.access }`)
            return `JWT ${ res.data.access }`
        }
        
        return null
    }catch(error){
        console.log(error)
        return null
    } 
}

export const register = async (data) => {
    try{
        const res = await apiClient.post("/auth/users/", data)
        if (res.status === 200 || res.status == 201){
            return true
        } 
        return false
    }catch(error){
        console.log(error)
        return false
    }
}

export const getActiveBusinessId = async (token) => {
    try{
        const res = await apiClient.get("/business/", {
            headers:{
                'Authorization': token
            }
        })
        if (res.status === 200){
            const active_business = res.data.filter(item => item.is_active)
            if (active_business.length > 0){
                localStorage.setItem("mp-business-id", active_business[0].id)
                return active_business[0].id
            }
            
            return null
        }
        return null
    }catch(error){
        console.log(error)
        return null
    }
}

export const getUserInfo = async (token) => {
    try{
        const res = await apiClient.get("/auth/users/me", {
            headers:{
                'Authorization': token
            }
        })

        if (res.status === 200){
            return res.data
        }
        return null
    }catch(error){
        console.log(error)
        return null
    }
}

export const getSalesInvoiceList = async (token) => {
    try{
        const res = await apiClient.get("/sales-invoices/", {
            headers: {
                Authorization: token
            }
        })
        if (res.status === 200){       
            return res.data.map(transformSalesInvoice)
        }
        console.log("There was an error fetching sales invoices.")
    } catch(error){
        console.log(error)
    }
}

export const getSalesInvoiceDetail = async (token, invoiceId) => {
    try{
        const res = await apiClient.get(`/sales-invoices/${invoiceId}/`, {
            headers: {
                Authorization: token
            }
        })
        if (res.status === 200){
            return res.data
        }
        return null

    }catch(error){
        console.log(error)
        return null
    }
}

export const postSalesInvoice = async (token, invoiceData) => {
    try {
        const res = await apiClient.post("/sales-invoices/", invoiceData, {
            headers: {
                Authorization: token
            }
        })

        if (res.status === 201) {
            return true
        }

        console.log(res.data.detail)
        return false
    } catch (error) {
        console.log(error)
        return false
    }
}

export const postSalesInvoiceItem = async (token, invoiceId, itemData) => {
    try {
        const res = await apiClient.post(`/sales-invoices/${invoiceId}/items/`, itemData, {
            headers: {
                Authorization: token
            }
        })

        if (res.status === 201) {
            return true
        }

        console.log(res.data.detail)
        return false
    } catch (error) {
        console.log(error)
        return false
    }
}

export const postSalesInvoiceAndItems = async (token, invoiceData) => {
    try {
        const res = await apiClient.post("/sales-invoices/create-with-items/", invoiceData, {
            headers: {
                Authorization: token
            }
        })
        if (res.status === 201) {
            return true
        }
        console.log(res.data.detail)
        return false
    } catch (error) {
        console.log(error)
        return false
    }
}

export const deleteSalesInvoice = async (token, invoiceId) => {
    try {
        const res = await apiClient.delete(`/sales-invoices/${invoiceId}/`, {
            headers: {
                Authorization: token
            }
        })
        
        if (res.status === 204){
            return true
        }

        console.log(res.data.detail)
        return false
    } catch(error){
        console.log(error)
        return false
    }
}

export const bulkDeleteSalesInvoice = async (token, invoiceIds) => {
    try {
        const res = await apiClient.post("/sales-invoices/bulk-delete/", { invoice_ids: invoiceIds }, {
            headers: {
                Authorization: token
            }
        })

        if (res.status === 200){
            return true
        }

        console.log(res.data.detail)
        return false
    } catch(error){
        console.log(error)
        return false
    }
}

export const updateSalesInvoiceAndItems = async (token, invoiceId, invoiceData) => {
    try {
        const res = await apiClient.post(`/sales-invoices/${invoiceId}/update-with-items/`, invoiceData, {
            headers: {
                Authorization: token
            }
        })

        if (res.status === 200){
            return true
        }

        console.log(res.data.detail)
        return false
    } catch(error){
        console.log(error)
        return false
    }
}

export const getPurchaseInvoiceList = async (token) => {
    try{
        const res = await apiClient.get("/purchase-invoices/", {
            headers: {
                Authorization: token
            }
        })
        if (res.status === 200){    
            console.log(res.data)   
            return res.data.map(transformPurchaseInvoice)
        }
        console.log("There was an error fetching purchase invoices.")
    } catch(error){
        console.log(error)
    }
}

export const getPurchaseInvoiceDetail = async (token, invoiceId) => {
    try{
        const res = await apiClient.get(`/purchase-invoices/${invoiceId}/`, {
            headers: {
                Authorization: token
            }
        })
        if (res.status === 200){
            return res.data
        }
        console.log("There was an error fetching purchase invoice details.")
        return null
    } catch(error){
        console.log(error)
        return null
    }
}

export const deletePurchaseInvoice = async (token, invoiceId) => {
    try {
        const res = await apiClient.delete(`/purchase-invoices/${invoiceId}/`, {
            headers: {
                Authorization: token
            }
        })
        if (res.status === 204){
            return true
        }

        console.log(res.data.detail)
        return false
    } catch(error){
        console.log(error)
        return false
    }
}

export const bulkDeletePurchaseInvoice = async (token, invoiceIds) => {
    try {
        const res = await apiClient.post("/purchase-invoices/bulk-delete/", { invoice_ids: invoiceIds }, {
            headers: {
                Authorization: token
            }
        })
        if (res.status === 200){
            return true
        }
        console.log(res.data.detail)
        return false
    } catch(error){
        console.log(error)
        return false
    }
}

export const postPurchaseInvoiceAndItems = async (token, invoiceData) => {
    try {
        const res = await apiClient.post("/purchase-invoices/create-with-items/", invoiceData, {
            headers: {
                Authorization: token
            }
        })
        if (res.status === 201){
            return true
        }
        console.log(res.data.detail)
        return false
    } catch(error){
        console.log(error)
        return false
    }
}

export const updatePurchaseInvoiceAndItems = async (token, invoiceId, invoiceData) => {
    try {
        const res = await apiClient.post(`/purchase-invoices/${invoiceId}/update-with-items/`, invoiceData, {
            headers: {
                Authorization: token
            }
        })
        if (res.status === 200){
            return res.data
        }
        console.log(res.data.detail)
        return null
    } catch(error){
        console.log(error)
        return null
    }
}
