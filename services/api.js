
import axios from "axios";
import { 
    transformSalesInvoice,
    transformPurchaseInvoice,
    transformInventoryItem,
    transformProduct,
    formatSearchQuery
} from "./utils";

const BASE_URL = "http://localhost:8000/"

const apiClient = axios.create({
    baseURL: BASE_URL,
    headers: {
        "Content-Type": "application/json"
    },
    timeout: 30000
})

export default class APIPackage {
  constructor(resource) {
    this.resource = resource;
  }

  getHeaders(token) {
    return {
      Authorization: token,
    }
  }

  async list(token, searchQuery = null) {
    try {
      const url = `/${this.resource}/${searchQuery ? searchQuery : ""}`;
      const res = await apiClient.get(url, {
        headers: this.getHeaders(token),
      });

      return res.status === 200 ? res.data : null;
    } catch (error) {
      console.log(`Error fetching ${this.resource} list:`, error);
      return null;
    }
  }

  async detail(token, id) {
    try {
      const res = await apiClient.get(`/${this.resource}/${id}/`, {
        headers: this.getHeaders(token),
      });

      return res.status === 200 ? res.data : null;
    } catch (error) {
      console.log(`Error fetching ${this.resource} detail:`, error);
      return null;
    }
  }

  async create(token, data) {
    try {
      const res = await apiClient.post(`/${this.resource}/`, data, {
        headers: this.getHeaders(token),
      });

      return res.status === 201;
    } catch (error) {
      console.log(`Error creating ${this.resource}:`, error);
      return false;
    }
  }

  async update(token, id, data) {
    try {
      const res = await apiClient.put(`/${this.resource}/${id}/`, data, {
        headers: this.getHeaders(token),
      });

      return res.status === 200;
    } catch (error) {
      console.log(`Error updating ${this.resource}:`, error);
      return false;
    }
  }

  async delete(token, id) {
    try {
      const res = await apiClient.delete(`/${this.resource}/${id}/`, {
        headers: this.getHeaders(token),
      });

      return res.status === 204;
    } catch (error) {
      console.log(`Error deleting ${this.resource}:`, error);
      return false;
    }
  }

  async bulkDelete(token, ids, param=null) {
    try {
      const res = await apiClient.post(
        `/${this.resource}/bulk-delete/`,
        { [`${param ? param: this.resource.slice(0, -1)}_ids`]: ids }, 
        {
          headers: this.getHeaders(token),
        }
      );

      return res.status === 200;
    } catch (error) {
      console.log(`Error bulk deleting ${this.resource}:`, error);
      return false;
    }
  }
}

export const locationsAPIPackage = new APIPackage("locations")

export const getUnitsList = async (token) => {
    try {
        const res = await apiClient.get("/units/", {
            headers: {
                Authorization: token
            }
        })

        if (res.status === 200) {
            return res.data
        }

        console.log("There was an error fetching the unit list.")
        return []
    } catch (error) {
        console.log("There was an error fetching the unit list: ", error)
        return []
    }
}

export const getCitiesList = async (token) => {
    try {
        const res = await apiClient.get("/cities/", {
            headers: {
                Authorization: token
            }
        })

        if (res.status === 200) {
            return res.data
        }

        console.log("There was an error fetching cities.")
        return []
    } catch (error) {
        console.log("There was an error fetching cities: ", error)
        return []
    }
}

export const getLocationsList = async (token) => {
    try {
        const res = await apiClient.get("/locations/", {
            headers: {
                Authorization: token
            }
        })

        if (res.status === 200) {
            return res.data
        }

        console.log("There was an error fetching the locations list.")
        return []
    } catch (error) {
        console.log("There was an error fetching the locations list: ", error)
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

// Supplier Endpoints

export const getSuppliersList = async (token, searchQuery=null) => {
    try{
        const res = await apiClient.get(`/suppliers/${searchQuery? searchQuery: ""}`, {
            headers: {
                Authorization: token
            }
        })
        if (res.status === 200){       
            return res.data
        }
        console.log("There was an error fetching suppliers.")
    } catch(error){
        console.log(error)
    }
}

export const getSupplierDetail = async (token, supplierId) => {
    try{
        const res = await apiClient.get(`/suppliers/${supplierId}/`, {
            headers: {
                Authorization: token
            }
        })
        if (res.status === 200){
            return res.data
        }
        console.log("There was an error fetching supplier details.")
        return null
    } catch(error){
        console.log(error)
        return null
    }
}

export const postSupplier = async (token, supplierData) => {
    try {
        const res = await apiClient.post("/suppliers/", supplierData, {
            headers: {
                Authorization: token
            }
        })

        if (res.status === 201) {
            return true
        }
        console.log(res.data.detail)
        return false
    }
    catch (error) {
        console.log("There was an error creating the supplier: ", error)
        return false
    }
}

export const updateSupplier = async (token, supplierId, supplierData) => {
    try{
        const res = await apiClient.put(`/suppliers/${supplierId}/`, supplierData, {
            headers: {
                Authorization: token
            }
        })
        if (res.status === 200) {
            return true
        }
        console.log(res.data.detail)
        return false
    }catch(error){
        console.log(error)
        return false
    }
}

export const deleteSupplier = async (token, supplierId) => {
    try {
        const res = await apiClient.delete(`/suppliers/${supplierId}/`, 
        {
            headers: {
                Authorization: token
            }
        })
    
        if (res.status === 204) {
            return true
        }
    
        console.log(res.data.detail)
        return false
    
    } catch (error) {
        console.log("There was an error deleting the supplier: ", error)
        return false
    }
}

export const bulkDeleteSuppliers = async (token, supplierIds) => {
    try {
        const res = await apiClient.post("/suppliers/bulk-delete/", { supplier_ids: supplierIds }, {
            headers: {
                Authorization: token
            }
        })
        if (res.status === 200) {
            return true
        }

        console.log(res.data.detail)
        return false
    } catch (error) {
        console.log("There was an error deleting suppliers: ", error)
        return false
    }
}

// Product Endpoints

export const getProductsList = async (token, searchQuery=null, is_formatted=false) => {
    try {
        const res = await apiClient.get(`/products/${searchQuery? searchQuery: ""}`, {
            headers: {
                Authorization: token
            }
        })

        if (res.status === 200) {

            if (is_formatted){
                return res.data.map(transformProduct)
            }
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

export const getProductDetail = async (token, productId) => {
    try{
        const res = await apiClient.get(`/products/${productId}/`, {
            headers: {
                Authorization: token
            }
        })
        if (res.status === 200){
            return res.data
        }
        console.log("There was an error fetching customer details.")
        return null
    } catch(error){
        console.log(error)
        return null
    }
}

export const postProduct = async (token, productData) => {
    try {
        const res = await apiClient.post("/products/", productData, {
            headers: {
                Authorization: token
            }
        })

        if (res.status === 201) {
            return true
        }
        console.log(res.data.detail)
        return false
    }
    catch (error) {
        console.log("There was an error creating the product: ", error)
        return false
    }
}

export const updateProduct = async (token, productId, productData) => {
    try{
        const res = await apiClient.put(`/products/${productId}/`, productData, {
            headers: {
                Authorization: token
            }
        })
        if (res.status === 200) {
            return true
        }
        console.log(res.data.detail)
        return false
    }catch(error){
        console.log(error)
        return false
    }
}

export const deleteProduct = async (token, productId) => {
    try {
        const res = await apiClient.delete(`/products/${productId}/`, 
        {
            headers: {
                Authorization: token
            }
        })
    
        if (res.status === 204) {
            return true
        }
    
        console.log(res.data.detail)
        return false
    
    } catch (error) {
        console.log("There was an error deleting the product: ", error)
        return false
    }
}

export const bulkDeleteProducts = async (token, productIds) => {
    try {
        const res = await apiClient.post("/products/bulk-delete/", { product_ids: productIds }, {
            headers: {
                Authorization: token
            }
        })
        if (res.status === 200) {
            return true
        }

        console.log(res.data.detail)
        return false
    } catch (error) {
        console.log("There was an error deleting products: ", error)
        return false
    }
}

// Customers Endpoints

export const postCustomer = async (token, customerData) => {
    try {
        const res = await apiClient.post("/customers/", customerData, {
            headers: {
                Authorization: token
            }
        })

        if (res.status === 201) {
            return true
        }
        console.log(res.data.detail)
        return false
    }
    catch (error) {
        console.log("There was an error creating the customer: ", error)
        return false
    }
}

export const getCustomersList = async (token, searchQuery=null) => {
    try{
        const res = await apiClient.get(`/customers/${searchQuery? searchQuery: ""}`, {
            headers: {
                Authorization: token
            }
        })
        if (res.status === 200){       
            return res.data
        }
        console.log("There was an error fetching customers.")
    } catch(error){
        console.log(error)
    }
}

export const getCustomerDetail = async (token, customerId) => {
    try{
        const res = await apiClient.get(`/customers/${customerId}/`, {
            headers: {
                Authorization: token
            }
        })
        if (res.status === 200){
            return res.data
        }
        console.log("There was an error fetching customer details.")
        return null
    } catch(error){
        console.log(error)
        return null
    }
}

export const updateCustomer = async (token, customerId, customerData) => {
    try{
        const res = await apiClient.put(`/customers/${customerId}/`, customerData, {
            headers: {
                Authorization: token
            }
        })
        if (res.status === 200) {
            return true
        }
        console.log(res.data.detail)
        return false
    }catch(error){
        console.log(error)
        return false
    }
}

export const deleteCustomer = async (token, customerId) => {
    try {
        const res = await apiClient.delete(`/customers/${customerId}/`, 
        {
            headers: {
                Authorization: token
            }
        })
    
        if (res.status === 204) {
            return true
        }
    
        console.log(res.data.detail)
        return false
    
    } catch (error) {
        console.log("There was an error deleting the customer: ", error)
        return false
    }
}

export const bulkDeleteCustomers = async (token, customerIds) => {
    try {
        const res = await apiClient.post("/customers/bulk-delete/", { customer_ids: customerIds }, {
            headers: {
                Authorization: token
            }
        })
        if (res.status === 200) {
            return true
        }

        console.log(res.data.detail)
        return false
    } catch (error) {
        console.log("There was an error deleting customers: ", error)
        return false
    }
}

// Sales Invoice Endpoints

export const getSalesInvoiceList = async (token, searchQuery=null) => {
    try{
        const res = await apiClient.get(`/sales-invoices/${searchQuery? searchQuery: ""}`, {
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

// quantity removed for now
export const returnSalesInvoiceItem = async (token, invoiceId, itemId, reason) => {
    try{
        const res = await apiClient.post(`sales-invoices/${invoiceId}/items/${itemId}/return/`, {
            reason: reason
        }, {
            headers: {
                Authorization: token
            }
        })

        if (res.status == 200){
            return true
        }else{
            console.log("error returning item.")
            return false
        }
    }catch(error){
        console.log("error returning item: ", error)
        return false
    }
}

// Purchase Invoice Endpoints

export const getPurchaseInvoiceList = async (token, searchQuery=null) => {
    try{
        const res = await apiClient.get(`/purchase-invoices/${searchQuery? searchQuery: ""}`, {
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

// Inventory Item Endpoints

export const getInventoryItemList = async (token, businessId, searchQuery=null) => {
    try {

        const res = await apiClient.get(`/inventory/${businessId}/items/${searchQuery? searchQuery: ""}`, {
            headers: {
                Authorization: token
            }
        })
        if (res.status === 200) {
            return res.data.map(transformInventoryItem)
        }
        console.log("Error fetching the inventory items.")
        return null
    } catch (error) {
        console.log("Error fetching the inventory items: ", error)
        return null
    }
}

export const getInventoryItemDetail = async (token, businessId, itemId) => {
    try {
        const res = await apiClient.get(`/inventory/${businessId}/items/${itemId}/`, {
            headers: {
                Authorization: token
            }
        })
        if (res.status === 200) {
            return res.data
        }
        console.log("Error fetching the inventory item details.")
        return null
    } catch (error) {
        console.log("Error fetching the inventory item details: ", error)
        return null
    }
}

export const postInventoryItem = async (token, businessId, itemData) => {
    try{
        const res = await apiClient.post(`/inventory/${businessId}/items/`, itemData, {
            headers: {
                Authorization: token
            }
        })
        if (res.status === 201) {
            return true
        }
        console.log(res.data.detail)
        return false
    }catch(error){
        console.log(error)
        return false
    }
}

export const updateInventoryItem = async (token, businessId, itemId, itemData) => {
    try{
        const res = await apiClient.put(`/inventory/${businessId}/items/${itemId}/`, itemData, {
            headers: {
                Authorization: token
            }
        })
        if (res.status === 200) {
            return true
        }
        console.log(res.data.detail)
        return false
    }catch(error){
        console.log(error)
        return false
    }
}

export const deleteInventoryItem = async (token, businessId, itemId) => {
    try {
        const res = await apiClient.delete(`/inventory/${businessId}/items/${itemId}/`, {
            headers: {
                Authorization: token
            }
        })
        if (res.status === 204) {
            return true
        }
        console.log(res.data.detail)
        return false
    } catch (error) {
        console.log(error)
        return false
    }
}

export const bulkDeleteInventoryItems = async (token, businessId, itemIds) => {
    try {
        const res = await apiClient.post(`/inventory/${businessId}/items/bulk-delete/`, { item_ids: itemIds }, {
            headers: {
                Authorization: token
            }
        })
        if (res.status === 200) {
            return true
        }
        console.log(res.data.detail)
        return false
    } catch (error) {
        console.log(error)
        return false
    }
}

export const returnedItemsAPIPackage = new APIPackage("returned-items")

export const globalSearch = async (query) => {
    try{
        res = await apiClient.get(`search/${formatSearchQuery(query)}`)
        if (res.status == 200){
            return res.data.results
        }
        
        console.log("error performing search: ", res.data.detail)
        return []
    }catch(error){
        console.log("error performing search", error)
        return []
    }
}