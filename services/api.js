
import axios from "axios";
import { 
    transformSalesInvoice,
    transformPurchaseInvoice,
    transformInventoryItem,
    transformProduct,
    formatSearchQuery,
    transformProductVariant
} from "./utils";

const BASE_URL = "http://localhost:8000/"
// const BASE_URL = "https://backend.market-pro.pk/"

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
export const expensesAPIPackage = new APIPackage("expenses")

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
        const res = await apiClient.get("/auth/users/me/", {
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

export const getProductVariantTypesList = async (token) => {
    try {
        const res = await apiClient.get(`/product-variant-types/`, {
            headers: {
                Authorization: token
            }
        })

        if (res.status === 200) {
            return res.data
        }

        console.log("There was an error fetching the product variants list.")
        return []
    } catch (error) {
        console.log("There was an error fetching the product variants list: ", error)
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

export const getProductVariantsList = async (token) => {
    try {
        const res = await apiClient.get("/product-variants/", {
            headers: {
                Authorization: token
            }
        })

        if (res.status === 200) {
            return res.data.map(transformProductVariant)
        }

        console.log("There was an error fetching the product list.")
        return []
    } catch (error) {
        console.log("There was an error fetching the product list: ", error)
        return []
    }
}

export const postProductAndVariants = async (token, productData) => {
    try {
        const res = await apiClient.post("/products/create-with-variants/", productData, {
            headers: {
                Authorization: token
            }
        })
        if (res.status === 201) {
            return true
        }
        return false
    } catch (error) {
        console.log(error)
        return false
    }
}

export const updateProductAndVariants = async (token, productId, productData) => {
    try {
        const res = await apiClient.post(`/products/${productId}/update-with-variants/`, productData, {
            headers: {
                Authorization: token
            }
        })
        if (res.status === 201) {
            return true
        }
        return false
    } catch (error) {
        console.log(error)
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
export const returnSalesInvoiceItem = async (token, invoiceId, itemId, quantity, reason) => {
    try{
        const res = await apiClient.post(`sales-invoices/${invoiceId}/items/${itemId}/return/`, {
            quantity: quantity,
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

export const globalSearch = async (token, searchQuery) => {
    try{
        const res = await apiClient.get(`search/${searchQuery}`, {
            headers: {
                Authorization: token
            }
        })
        if (res.status == 200){
            return res.data
        }
        
        console.log("error performing search: ", res.data.detail)
        return []
    }catch(error){
        console.log("error performing search", error)
        return []
    }
}

// INVENTORY METRICS

export const getTotalInventoryValue = async (token) =>{
    try {
        const res = await apiClient.get("inventory-kpis/total-inventory-value/", {
            headers: {
                Authorization: token
            }
        })

        if (res.status == 200) {
            return res.data.total_inventory_value
        }
    } catch (error) {
        console.log(error)
        return []
    }
}

export const getTotalRestocksReq = async (token) => {
    try {
        const res = await apiClient.get("inventory-kpis/total-restocks-required/", {
            headers: {
                Authorization: token
            }
        })

        if (res.status == 200) {
            return res.data.restocks_req
        }
    } catch (error) {
        console.log(error)
        return []
    }
}

// SUPPLIER METRICS

export const getTotalSuppliers = async (token) =>{
    try {
        const res = await apiClient.get("supplier-kpis/total-suppliers/", {
            headers: {
                Authorization: token
            }
        })

        if (res.status == 200) {
            return res.data.total_suppliers
        }
    } catch (error) {
        console.log(error)
        return []
    }
}

// CUSTOMER METRICS

export const getTotalCustomers = async (token) =>{
    try {
        const res = await apiClient.get("customer-kpis/total-customers/", {
            headers: {
                Authorization: token
            }
        })

        if (res.status == 200) {
            return res.data.total_customers
        }
    } catch (error) {
        console.log(error)
        return []
    }
}

// PRODUCT METRICS

export const getTotalProducts = async (token) =>{
    try {
        const res = await apiClient.get("product-kpis/total-products/", {
            headers: {
                Authorization: token
            }
        })

        if (res.status == 200) {
            return res.data.total_products
        }
    } catch (error) {
        console.log(error)
        return []
    }
}

// LOCATION METRICS

export const getTotalLocations = async (token) =>{
    try {
        const res = await apiClient.get("location-kpis/total-locations/", {
            headers: {
                Authorization: token
            }
        })

        if (res.status == 200) {
            return res.data.total_locations
        }
    } catch (error) {
        console.log(error)
        return []
    }
}

//SALES METRICS

export const getTotalSalesDaily = async (token) =>{
    try {
        const res = await apiClient.get("sales-kpis/daily-total-sales/", {
            headers: {
                Authorization: token
            }
        })

        if (res.status == 200) {
            return res.data.total_daily_sales
        }
    } catch (error) {
        console.log(error)
        return []
    }
}

export const getTotalItemsSoldDaily = async (token) => {
    try {
        const res = await apiClient.get("sales-kpis/daily-total-items/", {
            headers: {
                Authorization: token
            }
        })

        if (res.status == 200) {
            return res.data.total_items
        }
    } catch (error) {
        console.log(error)
        return []
    }
}

export const getTotalSalesInvoicesDaily = async (token) => {
    try {
        const res = await apiClient.get("sales-kpis/daily-total-sales-invoices/", {
            headers: {
                Authorization: token
            }
        })

        if (res.status == 200) {
            return res.data.total_invoices
        }
    } catch (error) {
        console.log(error)
        return []
    }
}

export const getRecentSales = async (token) =>{
    try {
        const res = await apiClient.get("sales-kpis/recent-sales/", {
            headers: {
                Authorization: token
            }
        })

        if (res.status == 200) {
            return res.data.recent_sales
        }
    } catch (error) {
        console.log(error)
        return []
    }
}

export const getMonthlySalesTrend = async (token) =>{
    try {
        const res = await apiClient.get("sales-kpis/monthly-sales-trend/", {
            headers: {
                Authorization: token
            }
        })

        if (res.status == 200) {
            return res.data.monthly_sales_trend
        }
    } catch (error) {
        console.log(error)
        return []
    }
}

export const getAvgOrderValue = async (token) =>{
    try {
        const res = await apiClient.get("sales-kpis/average-order-value/", {
            headers: {
                Authorization: token
            }
        })

        if (res.status == 200) {
            return res.data.avg_order_value
        }
    } catch (error) {
        console.log(error)
        return []
    }
}

// PURCHASES METRICS
export const getTotalPurchases = async (token) =>{
    try {
        const res = await apiClient.get("purchases-kpis/total-purchases/", {
            headers: {
                Authorization: token
            }
        })

        if (res.status == 200) {
            return res.data.total_purchases
        }
    } catch (error) {
        console.log(error)
        return []
    }
}

export const getTotalPurchasesMonthly = async (token) =>{
    try {
        const res = await apiClient.get("purchases-kpis/monthly-total-purchases/", {
            headers: {
                Authorization: token
            }
        })

        if (res.status == 200) {
            return res.data.total_purchases
        }
    } catch (error) {
        console.log(error)
        return []
    }
}

export const getTotalPendingPurchaseInvoices = async (token) =>{
    try {
        const res = await apiClient.get("purchases-kpis/total-pending-invoices/", {
            headers: {
                Authorization: token
            }
        })

        if (res.status == 200) {
            return res.data.total_invoices
        }
    } catch (error) {
        console.log(error)
        return []
    }
}

export const getTotalPurchaseInvoicesMonthly = async (token) => {
    try {
        const res = await apiClient.get("purchases-kpis/monthly-total-purchase-invoices/", {
            headers: {
                Authorization: token
            }
        })

        if (res.status == 200) {
            return res.data.total_invoices
        }
    } catch (error) {
        console.log(error)
        return []
    }
}

export const getTotalPendingPayment = async (token) => {
    try {
        const res = await apiClient.get("purchases-kpis/total-pending-payment/", {
            headers: {
                Authorization: token
            }
        })

        if (res.status == 200) {
            return res.data.total_payment
        }
    } catch (error) {
        console.log(error)
        return []
    }
}

export const getInvoicePDFData = async (token, invoiceId) =>{
    try {
        const res = await apiClient.get(`sales-invoices/${invoiceId}/print-invoice/`, {
            headers: {
                Authorization: token
            }
        })

        if (res.status == 200) {
            return res.data
        }
    } catch (error) {
        console.log(error)
        return []
    }
}

// RETURNED ITEMS METRICS

export const getTotalReturnedItems = async (token) =>{
    try {
        const res = await apiClient.get("returned-items-kpis/total-returned-items/", {
            headers: {
                Authorization: token
            }
        })

        if (res.status == 200) {
            return res.data.total_returned_items
        }
    } catch (error) {
        console.log(error)
        return []
    }
}

// SUPPLIER METRICS

// EXPENSES METRICS


export const getTotalExpensesMonthly = async (token) =>{
    try {
        const res = await apiClient.get("expenses-kpis/monthly-total-expenses/", {
            headers: {
                Authorization: token
            }
        })

        if (res.status == 200) {
            return res.data.monthly_total_expenses
        }
    } catch (error) {
        console.log(error)
        return []
    }
}

export const getTotalExpenseAmountMonthly = async (token) =>{
    try {
        const res = await apiClient.get("expenses-kpis/monthly-total-expense-amount/", {
            headers: {
                Authorization: token
            }
        })

        if (res.status == 200) {
            return res.data.monthly_total_expense_amount
        }
    } catch (error) {
        console.log(error)
        return []
    }
}

export const getMonthlyExpensesTrend = async (token) =>{
    try {
        const res = await apiClient.get("expenses-kpis/monthly-expenses-trend/", {
            headers: {
                Authorization: token
            }
        })

        if (res.status == 200) {
            return res.data.monthly_expenses_trend
        }
    } catch (error) {
        console.log(error)
        return []
    }
}