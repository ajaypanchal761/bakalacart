import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { 
  ArrowLeft,
  Search,
  Mic,
  MoreVertical,
  ChevronRight,
  Star,
  RotateCcw,
  AlertCircle,
  Loader2,
  Package,
  CheckCircle2,
  XCircle,
  Clock,
  Check,
  X,
  MapPin,
  Navigation,
  Camera,
  IndianRupee
} from "lucide-react"
import { deliveryAPI, uploadAPI } from "@/lib/api"
import { toast } from "sonner"
import { motion } from "framer-motion"

export default function MyOrders() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("pending")

  // Fetch orders from API
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true)
        
        let ordersData = []
        
        if (activeTab === "pending") {
          // Fetch active assigned orders for pending tab
          console.log('🔄 Fetching active assigned orders...')
          const response = await deliveryAPI.getOrders({ 
            includeDelivered: false, 
            limit: 100 
          })
          
          if (response?.data?.success && response?.data?.data?.orders) {
            ordersData = response.data.data.orders || []
            console.log('✅ Found active orders:', ordersData.length)
          }
        } else {
          // Fetch all orders (delivered/cancelled) using Trip History API
          console.log('🔄 Fetching order history...')
          const response = await deliveryAPI.getTripHistory({
            period: 'monthly',
            date: new Date().toISOString().split('T')[0],
            status: activeTab === "delivered" ? "Completed" : activeTab === "cancelled" ? "Cancelled" : "ALL TRIPS",
            limit: 1000
          })
          
          if (response?.data?.success && response?.data?.data?.trips) {
            ordersData = response.data.data.trips || []
            console.log(`✅ Found ${activeTab} orders:`, ordersData.length)
          } else if (response?.data?.data?.orders) {
            ordersData = response.data.data.orders || []
          }
        }
        
        setOrders(ordersData)
      } catch (error) {
        console.error('❌ Error fetching orders:', error)
        const errorMessage = error?.response?.data?.message || error?.message || 'Failed to load orders'
        toast.error(errorMessage)
        setOrders([])
      } finally {
        setLoading(false)
      }
    }

    fetchOrders()
  }, [activeTab])

  // Format date like "06 Jan, 11:57AM"
  const formatOrderDate = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    const day = date.getDate().toString().padStart(2, '0')
    const month = date.toLocaleDateString('en-IN', { month: 'short' })
    const hours = date.getHours()
    const minutes = date.getMinutes().toString().padStart(2, '0')
    const ampm = hours >= 12 ? 'PM' : 'AM'
    const displayHours = hours % 12 || 12
    return `${day} ${month}, ${displayHours}:${minutes}${ampm}`
  }

  // Get restaurant location/address - Show full pinned address (formattedAddress)
  const getRestaurantLocation = (order) => {
    // Priority 1: Use formattedAddress (pinned live location from restaurant)
    if (order.restaurantId?.location?.formattedAddress) {
      const addr = order.restaurantId.location.formattedAddress.trim()
      // Check if it's just coordinates (latitude, longitude format)
      const isCoordinates = /^-?\d+\.\d+,\s*-?\d+\.\d+$/.test(addr)
      if (!isCoordinates && addr !== 'Select location') {
        return addr
      }
    }
    
    // Priority 2: Build from address components (addressLine1, area, city, state, pincode)
    if (order.restaurantId?.location) {
      const loc = order.restaurantId.location
      const addressParts = []
      
      if (loc.addressLine1) {
        addressParts.push(loc.addressLine1.trim())
      } else if (loc.street) {
        addressParts.push(loc.street.trim())
      }
      
      if (loc.addressLine2) {
        addressParts.push(loc.addressLine2.trim())
      }
      
      if (loc.area) {
        addressParts.push(loc.area.trim())
      }
      
      if (loc.city) {
        addressParts.push(loc.city.trim())
      }
      
      if (loc.state) {
        addressParts.push(loc.state.trim())
      }
      
      const pinCode = loc.pincode || loc.zipCode || loc.postalCode
      if (pinCode) {
        addressParts.push(pinCode.toString().trim())
      }
      
      if (addressParts.length > 0) {
        return addressParts.join(', ')
      }
    }
    
    // Priority 3: Use address field
    if (order.restaurantId?.location?.address) {
      return order.restaurantId.location.address.trim()
    }
    
    // Priority 4: Fallback to restaurant address
    if (order.restaurantId?.address) {
      return order.restaurantId.address.trim()
    }
    
    // Priority 5: Fallback to area and city
    if (order.restaurantId?.location?.area) {
      return order.restaurantId.location.area + (order.restaurantId.location.city ? ', ' + order.restaurantId.location.city : '')
    }
    
    // Priority 6: Fallback to customer address city/state
    if (order.address?.city) {
      return order.address.city + (order.address.state ? ', ' + order.address.state : '')
    }
    
    return 'Location not available'
  }

  // Get restaurant image
  const getRestaurantImage = (order) => {
    if (order.items && order.items.length > 0 && order.items[0].image) {
      return order.items[0].image
    }
    if (order.restaurantId?.profileImage?.url) {
      return order.restaurantId.profileImage.url
    }
    return "https://images.unsplash.com/photo-1555949258-eb67b1ef0ceb?auto=format&fit=crop&w=100&q=80"
  }

  // Check if payment failed
  const isPaymentFailed = (order) => {
    return order.payment?.status === 'failed' || order.payment?.status === 'pending'
  }

  // Get order status text
  const getOrderStatus = (order) => {
    const status = order.status || order.orderStatus
    if (status === 'delivered') return 'Delivered'
    if (status === 'completed') return 'Delivered'
    if (status === 'out_for_delivery') return 'Out for Delivery'
    if (status === 'ready') return 'Ready'
    if (status === 'preparing') return 'Preparing'
    if (status === 'accepted') return 'Accepted'
    if (status === 'cancelled') return 'Cancelled'
    return status || 'Pending'
  }

  // Check if order is active/assigned
  const isActiveOrder = (order) => {
    const status = order.status || order.orderStatus
    const deliveryPhase = order.deliveryState?.currentPhase
    return (
      status !== 'delivered' && 
      status !== 'completed' && 
      status !== 'cancelled' &&
      deliveryPhase !== 'completed'
    )
  }

  // Check if order is accepted by delivery boy
  const isAcceptedByDeliveryBoy = (order) => {
    const deliveryStateStatus = order.deliveryState?.status
    const deliveryPhase = order.deliveryState?.currentPhase
    return (
      deliveryStateStatus === 'accepted' ||
      deliveryPhase === 'en_route_to_pickup' ||
      deliveryPhase === 'at_pickup' ||
      deliveryPhase === 'en_route_to_delivery' ||
      deliveryPhase === 'at_delivery'
    )
  }

  // Check if reached pickup confirmed
  const isReachedPickup = (order) => {
    const deliveryStateStatus = order.deliveryState?.status
    const deliveryPhase = order.deliveryState?.currentPhase
    return (
      deliveryStateStatus === 'reached_pickup' ||
      deliveryPhase === 'at_pickup'
    )
  }

  // Check if order picked up (order ID confirmed)
  const isOrderPickedUp = (order) => {
    const deliveryStateStatus = order.deliveryState?.status
    const deliveryPhase = order.deliveryState?.currentPhase
    return (
      deliveryStateStatus === 'order_confirmed' ||
      deliveryPhase === 'en_route_to_delivery' ||
      deliveryPhase === 'picked_up'
    )
  }

  // Check if reached drop
  const isReachedDrop = (order) => {
    const deliveryStateStatus = order.deliveryState?.status
    const deliveryPhase = order.deliveryState?.currentPhase
    return (
      deliveryStateStatus === 'reached_drop' ||
      deliveryPhase === 'at_delivery'
    )
  }

  // Check if order delivered
  const isOrderDelivered = (order) => {
    const status = order.status || order.orderStatus
    const deliveryStateStatus = order.deliveryState?.status
    const deliveryPhase = order.deliveryState?.currentPhase
    return (
      status === 'delivered' ||
      deliveryStateStatus === 'delivered' ||
      deliveryPhase === 'delivered'
    )
  }

  // Filter orders by search query and tab
  const filteredOrders = orders.filter(order => {
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const restaurantName = (order.restaurantName || order.restaurantId?.name || '').toLowerCase()
      const itemNames = (order.items || []).map(item => item.name?.toLowerCase() || '').join(' ')
      const orderId = (order.orderId || order._id || '').toLowerCase()
      if (!restaurantName.includes(query) && !itemNames.includes(query) && !orderId.includes(query)) {
        return false
      }
    }

    // Filter by tab
    if (activeTab === "pending") {
      return isActiveOrder(order)
    } else if (activeTab === "delivered") {
      const status = order.status || order.orderStatus
      return status === 'delivered' || status === 'completed'
    } else if (activeTab === "cancelled") {
      const status = order.status || order.orderStatus
      return status === 'cancelled'
    }
    
    return true
  })

  const handleOrderClick = (order) => {
    const orderId = order.orderId || order._id
    if (orderId) {
      navigate(`/delivery/order/${orderId}`)
    }
  }

  // Handle accept order
  const handleAcceptOrder = async (order) => {
    const orderId = order.orderId || order._id
    if (!orderId) {
      toast.error('Order ID not found')
      return
    }

    let currentLocation = null
    try {
      // Get current location
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 5000,
          enableHighAccuracy: true
        })
      })

      currentLocation = [position.coords.latitude, position.coords.longitude]

      const response = await deliveryAPI.acceptOrder(orderId, {
        currentLat: currentLocation[0],
        currentLng: currentLocation[1]
      })

      if (response.data?.success) {
        toast.success('Order accepted successfully!')
        // Refresh orders
        const fetchResponse = await deliveryAPI.getOrders({ 
          includeDelivered: false, 
          limit: 100 
        })
        if (fetchResponse?.data?.success && fetchResponse?.data?.data?.orders) {
          setOrders(fetchResponse.data.data.orders || [])
        }
        // Navigate to order details
        navigate(`/delivery/order/${orderId}`)
      } else {
        toast.error(response.data?.message || 'Failed to accept order')
      }
    } catch (error) {
      console.error('Error accepting order:', error)
      console.error('Error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        orderId: orderId,
        location: currentLocation || 'Not available'
      })
      
      // Show more detailed error message
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          'Failed to accept order'
      toast.error(`Error: ${errorMessage}`)
    }
  }

  // Handle reject order
  const handleRejectOrder = async (order) => {
    const orderId = order.orderId || order._id
    if (!orderId) {
      toast.error('Order ID not found')
      return
    }

    try {
      const response = await deliveryAPI.denyOrder(orderId, {
        reason: 'Not available'
      })

      if (response.data?.success) {
        toast.success('Order rejected')
        // Refresh orders
        const fetchResponse = await deliveryAPI.getOrders({ 
          includeDelivered: false, 
          limit: 100 
        })
        if (fetchResponse?.data?.success && fetchResponse?.data?.data?.orders) {
          setOrders(fetchResponse.data.data.orders || [])
        }
      } else {
        toast.error(response.data?.message || 'Failed to reject order')
      }
    } catch (error) {
      console.error('Error rejecting order:', error)
      toast.error(error.response?.data?.message || 'Failed to reject order')
    }
  }

  // Swipeable Reached Pickup Button Component (only swipe right)
  const SwipeableReachedPickupButton = ({ order, onReachedPickup }) => {
    const [swipeProgress, setSwipeProgress] = useState(0)
    const [isSwiping, setIsSwiping] = useState(false)
    const buttonRef = useRef(null)
    const startXRef = useRef(0)
    const currentXRef = useRef(0)

    const handleTouchStart = (e) => {
      e.stopPropagation()
      const touch = e.touches[0]
      startXRef.current = touch.clientX
      currentXRef.current = touch.clientX
      setIsSwiping(true)
      setSwipeProgress(0)
    }

    const handleTouchMove = (e) => {
      e.stopPropagation()
      if (!isSwiping) return

      const touch = e.touches[0]
      currentXRef.current = touch.clientX
      const deltaX = currentXRef.current - startXRef.current
      
      // Only allow right swipe (positive deltaX)
      if (deltaX < 0) {
        setSwipeProgress(0)
        return
      }

      const buttonWidth = buttonRef.current?.offsetWidth || 200
      const progress = Math.min(deltaX / buttonWidth, 1)
      setSwipeProgress(progress)
    }

    const handleTouchEnd = (e) => {
      e.stopPropagation()
      if (!isSwiping) return

      const deltaX = currentXRef.current - startXRef.current
      const buttonWidth = buttonRef.current?.offsetWidth || 200
      const threshold = buttonWidth * 0.6 // 60% swipe required

      if (deltaX >= threshold) {
        // Swipe right = Confirm Reached Pickup
        onReachedPickup(order)
      }

      // Reset
      setIsSwiping(false)
      setSwipeProgress(0)
      startXRef.current = 0
      currentXRef.current = 0
    }

    return (
      <div 
        ref={buttonRef}
        className="relative w-full h-14 rounded-xl overflow-hidden bg-green-600"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ touchAction: 'pan-y' }}
      >
        {/* Swipe Progress Indicator */}
        {swipeProgress > 0 && (
          <motion.div
            className="absolute inset-0 bg-green-700"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: swipeProgress }}
            transition={{ duration: 0 }}
            style={{ transformOrigin: 'left' }}
          />
        )}

        {/* Button Content */}
        <div className="relative z-10 h-full flex items-center justify-center px-6">
          <div className="flex items-center gap-3 text-white font-semibold">
            <span className="text-base">
              {swipeProgress > 0.5 ? 'Release to Confirm' : 'Swipe to Confirm Reached Pickup'}
            </span>
            {swipeProgress > 0.5 && (
              <Check className="w-5 h-5" />
            )}
            {swipeProgress <= 0.5 && (
              <ChevronRight className="w-5 h-5" />
            )}
          </div>
        </div>

        {/* Swipe Hint */}
        {swipeProgress === 0 && (
          <div className="absolute inset-0 flex items-center justify-end px-4 text-white/60 text-xs pointer-events-none">
            <span className="flex items-center gap-1">
              Swipe Right
              <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        )}
      </div>
    )
  }

  // State for bill image upload
  const [billImages, setBillImages] = useState({}) // { orderId: imageUrl }
  const [uploadingBills, setUploadingBills] = useState({}) // { orderId: true/false }
  const fileInputRefs = useRef({}) // { orderId: inputRef }

  // Handle reached pickup
  const handleReachedPickup = async (order) => {
    const orderId = order.orderId || order._id
    if (!orderId) {
      toast.error('Order ID not found')
      return
    }

    try {
      const response = await deliveryAPI.confirmReachedPickup(orderId)

      if (response.data?.success) {
        toast.success('Reached pickup confirmed!')
        // Refresh orders
        const fetchResponse = await deliveryAPI.getOrders({ 
          includeDelivered: false, 
          limit: 100 
        })
        if (fetchResponse?.data?.success && fetchResponse?.data?.data?.orders) {
          setOrders(fetchResponse.data.data.orders || [])
        }
      } else {
        toast.error(response.data?.message || 'Failed to confirm reached pickup')
      }
    } catch (error) {
      console.error('Error confirming reached pickup:', error)
      toast.error(error.response?.data?.message || 'Failed to confirm reached pickup')
    }
  }

  // Handle bill image capture/upload
  const handleBillImageCapture = async (order, e) => {
    e.stopPropagation()
    const orderId = order.orderId || order._id
    
    // Check if Flutter handler is available
    if (window.flutter_inappwebview && typeof window.flutter_inappwebview.callHandler === 'function') {
      try {
        const result = await window.flutter_inappwebview.callHandler('openCamera', {
          source: 'camera',
          accept: 'image/*',
          multiple: false,
          quality: 0.8
        })
        
        if (result && result.success && result.file) {
          await handleBillImageUpload(order, result.file)
        }
      } catch (error) {
        console.error('Error with Flutter camera:', error)
        // Fallback to file input
        fileInputRefs.current[orderId]?.click()
      }
    } else {
      // Fallback to file input
      fileInputRefs.current[orderId]?.click()
    }
  }

  // Handle bill image file selection
  const handleBillImageSelect = async (order, e) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB')
      return
    }
    
    await handleBillImageUpload(order, file)
  }

  // Upload bill image
  const handleBillImageUpload = async (order, file) => {
    const orderId = order.orderId || order._id
    setUploadingBills(prev => ({ ...prev, [orderId]: true }))
    
    try {
      const response = await uploadAPI.uploadMedia(file, {
        folder: 'appzeto/delivery/bills'
      })
      
      if (response?.data?.success && response?.data?.data?.url) {
        setBillImages(prev => ({ ...prev, [orderId]: response.data.data.url }))
        toast.success('Bill image uploaded!')
      } else {
        throw new Error('Upload failed')
      }
    } catch (error) {
      console.error('Error uploading bill:', error)
      toast.error('Failed to upload bill image')
    } finally {
      setUploadingBills(prev => ({ ...prev, [orderId]: false }))
    }
  }

  // Handle order pickup (after bill upload)
  const handleOrderPickup = async (order) => {
    const orderId = order.orderId || order._id
    if (!orderId) {
      toast.error('Order ID not found')
      return
    }

    const billImageUrl = billImages[orderId]
    if (!billImageUrl) {
      toast.error('Please upload bill image first')
      return
    }

    try {
      const response = await deliveryAPI.confirmOrderId(orderId, order.orderId || orderId, {}, {
        billImageUrl
      })

      if (response.data?.success) {
        toast.success('Order picked up!')
        // Refresh orders
        const fetchResponse = await deliveryAPI.getOrders({ 
          includeDelivered: false, 
          limit: 100 
        })
        if (fetchResponse?.data?.success && fetchResponse?.data?.data?.orders) {
          setOrders(fetchResponse.data.data.orders || [])
        }
      } else {
        toast.error(response.data?.message || 'Failed to confirm order pickup')
      }
    } catch (error) {
      console.error('Error confirming order pickup:', error)
      toast.error(error.response?.data?.message || 'Failed to confirm order pickup')
    }
  }

  // Handle reached drop
  const handleReachedDrop = async (order) => {
    const orderId = order.orderId || order._id
    if (!orderId) {
      toast.error('Order ID not found')
      return
    }

    try {
      const response = await deliveryAPI.confirmReachedDrop(orderId)

      if (response.data?.success) {
        toast.success('Reached drop confirmed!')
        // Refresh orders
        const fetchResponse = await deliveryAPI.getOrders({ 
          includeDelivered: false, 
          limit: 100 
        })
        if (fetchResponse?.data?.success && fetchResponse?.data?.data?.orders) {
          setOrders(fetchResponse.data.data.orders || [])
        }
      } else {
        toast.error(response.data?.message || 'Failed to confirm reached drop')
      }
    } catch (error) {
      console.error('Error confirming reached drop:', error)
      toast.error(error.response?.data?.message || 'Failed to confirm reached drop')
    }
  }

  // Handle order delivered
  const handleOrderDelivered = async (order) => {
    const orderId = order.orderId || order._id
    if (!orderId) {
      toast.error('Order ID not found')
      return
    }

    try {
      const response = await deliveryAPI.completeDelivery(orderId)

      if (response.data?.success) {
        const earnings = response.data.data?.earnings?.amount || response.data.data?.totalEarning || 0
        toast.success(`Order delivered! Earnings: ₹${earnings.toFixed(2)}`)
        // Refresh orders
        const fetchResponse = await deliveryAPI.getOrders({ 
          includeDelivered: false, 
          limit: 100 
        })
        if (fetchResponse?.data?.success && fetchResponse?.data?.data?.orders) {
          setOrders(fetchResponse.data.data.orders || [])
        }
      } else {
        toast.error(response.data?.message || 'Failed to complete delivery')
      }
    } catch (error) {
      console.error('Error completing delivery:', error)
      toast.error(error.response?.data?.message || 'Failed to complete delivery')
    }
  }

  // Handle location button click - navigate to DeliveryHome with order data (restaurant location)
  const handleRestaurantLocationClick = async (order, e) => {
    e.stopPropagation()
    
    try {
      // Get current location
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 5000,
          enableHighAccuracy: true
        })
      })

      const currentLocation = [position.coords.latitude, position.coords.longitude]
      
      // Prepare order data for DeliveryHome (restaurant route)
      const orderData = {
        id: order.orderId || order._id,
        orderId: order.orderId,
        name: order.restaurantName || order.restaurantId?.name || 'Restaurant',
        address: getRestaurantLocation(order),
        lat: order.restaurantId?.location?.coordinates?.[1] || order.restaurantId?.location?.latitude,
        lng: order.restaurantId?.location?.coordinates?.[0] || order.restaurantId?.location?.longitude,
        customerName: order.userId?.name || 'Customer',
        customerAddress: order.address?.formattedAddress || order.address?.street || 'Customer address',
        customerLat: order.address?.location?.coordinates?.[1] || order.address?.location?.latitude,
        customerLng: order.address?.location?.coordinates?.[0] || order.address?.location?.longitude,
        items: order.items || [],
        total: order.pricing?.total || 0,
        paymentMethod: order.payment?.method || 'razorpay',
        orderStatus: order.status || 'preparing',
        deliveryPhase: order.deliveryState?.currentPhase || 'en_route_to_pickup',
        distance: order.assignmentInfo?.distance || null,
        pickupDistance: order.assignmentInfo?.distance || null,
        estimatedEarnings: order.pricing?.deliveryFee || 0
      }

      // Store order data in localStorage for DeliveryHome to use
      localStorage.setItem('deliveryActiveOrder', JSON.stringify({
        restaurantInfo: orderData,
        showMap: true,
        showRoute: true,
        hasDirectionsAPI: true,
        acceptedAt: new Date().toISOString(),
        currentLocation: currentLocation,
        navigationMode: 'restaurant' // Route to restaurant
      }))

      // Navigate to DeliveryHome
      navigate('/delivery')
    } catch (error) {
      console.error('Error getting location:', error)
      toast.error('Location not available. Please enable location services.')
    }
  }

  // Handle customer location button click - navigate to DeliveryHome with customer route
  const handleCustomerLocationClick = async (order, e) => {
    e.stopPropagation()
    
    try {
      // Get current location
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 5000,
          enableHighAccuracy: true
        })
      })

      const currentLocation = [position.coords.latitude, position.coords.longitude]
      
      // Prepare order data for DeliveryHome (customer route)
      const orderData = {
        id: order.orderId || order._id,
        orderId: order.orderId,
        name: order.restaurantName || order.restaurantId?.name || 'Restaurant',
        address: getRestaurantLocation(order),
        lat: order.restaurantId?.location?.coordinates?.[1] || order.restaurantId?.location?.latitude,
        lng: order.restaurantId?.location?.coordinates?.[0] || order.restaurantId?.location?.longitude,
        customerName: order.userId?.name || 'Customer',
        customerAddress: order.address?.formattedAddress || order.address?.street || 'Customer address',
        customerLat: order.address?.location?.coordinates?.[1] || order.address?.location?.latitude,
        customerLng: order.address?.location?.coordinates?.[0] || order.address?.location?.longitude,
        items: order.items || [],
        total: order.pricing?.total || 0,
        paymentMethod: order.payment?.method || 'razorpay',
        orderStatus: order.status || 'preparing',
        deliveryPhase: order.deliveryState?.currentPhase || 'en_route_to_delivery',
        distance: order.assignmentInfo?.distance || null,
        estimatedEarnings: order.pricing?.deliveryFee || 0
      }

      // Store order data in localStorage for DeliveryHome to use
      localStorage.setItem('deliveryActiveOrder', JSON.stringify({
        restaurantInfo: orderData,
        showMap: true,
        showRoute: true,
        hasDirectionsAPI: true,
        acceptedAt: new Date().toISOString(),
        currentLocation: currentLocation,
        navigationMode: 'customer' // Route to customer
      }))

      // Navigate to DeliveryHome
      navigate('/delivery')
    } catch (error) {
      console.error('Error getting location:', error)
      toast.error('Location not available. Please enable location services.')
    }
  }

  // Swipeable Button Component
  const SwipeableActionButton = ({ order, onAccept, onReject }) => {
    const [swipeProgress, setSwipeProgress] = useState(0)
    const [isSwiping, setIsSwiping] = useState(false)
    const [swipeDirection, setSwipeDirection] = useState(null) // 'accept' or 'reject'
    const buttonRef = useRef(null)
    const startXRef = useRef(0)
    const currentXRef = useRef(0)

    const handleTouchStart = (e) => {
      e.stopPropagation()
      const touch = e.touches[0]
      startXRef.current = touch.clientX
      currentXRef.current = touch.clientX
      setIsSwiping(true)
      setSwipeProgress(0)
      setSwipeDirection(null)
    }

    const handleTouchMove = (e) => {
      e.stopPropagation()
      if (!isSwiping) return

      const touch = e.touches[0]
      currentXRef.current = touch.clientX
      const deltaX = currentXRef.current - startXRef.current
      const buttonWidth = buttonRef.current?.offsetWidth || 200
      const progress = Math.abs(deltaX) / buttonWidth
      const clampedProgress = Math.min(progress, 1)

      setSwipeProgress(clampedProgress)

      // Determine direction
      if (deltaX > 20) {
        setSwipeDirection('accept') // Swipe right = accept
      } else if (deltaX < -20) {
        setSwipeDirection('reject') // Swipe left = reject
      } else {
        setSwipeDirection(null)
      }
    }

    const handleTouchEnd = (e) => {
      e.stopPropagation()
      if (!isSwiping) return

      const deltaX = currentXRef.current - startXRef.current
      const buttonWidth = buttonRef.current?.offsetWidth || 200
      const threshold = buttonWidth * 0.6 // 60% swipe required

      if (Math.abs(deltaX) >= threshold) {
        if (deltaX > 0 && swipeDirection === 'accept') {
          // Swipe right = Accept
          onAccept(order)
        } else if (deltaX < 0 && swipeDirection === 'reject') {
          // Swipe left = Reject
          onReject(order)
        }
      }

      // Reset
      setIsSwiping(false)
      setSwipeProgress(0)
      setSwipeDirection(null)
      startXRef.current = 0
      currentXRef.current = 0
    }

    const getButtonColor = () => {
      if (swipeDirection === 'accept') {
        return 'bg-green-600'
      } else if (swipeDirection === 'reject') {
        return 'bg-red-600'
      }
      return 'bg-green-600'
    }

    const getButtonText = () => {
      if (swipeDirection === 'accept') {
        return 'Accept Order'
      } else if (swipeDirection === 'reject') {
        return 'Reject Order'
      }
      return 'Swipe to Accept'
    }

    return (
      <div 
        ref={buttonRef}
        className="relative w-full h-14 rounded-xl overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ touchAction: 'pan-y' }}
      >
        {/* Background */}
        <div className={`absolute inset-0 ${getButtonColor()} transition-colors duration-200`} />
        
        {/* Swipe Progress Indicator */}
        {swipeProgress > 0 && (
          <motion.div
            className={`absolute inset-0 ${
              swipeDirection === 'accept' ? 'bg-green-700' : 'bg-red-700'
            }`}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: swipeProgress }}
            transition={{ duration: 0 }}
            style={{ transformOrigin: swipeDirection === 'accept' ? 'left' : 'right' }}
          />
        )}

        {/* Button Content */}
        <div className="relative z-10 h-full flex items-center justify-center px-6">
          <div className="flex items-center gap-3 text-white font-semibold">
            {swipeDirection === 'reject' && (
              <X className="w-5 h-5" />
            )}
            <span className="text-base">{getButtonText()}</span>
            {swipeDirection === 'accept' && (
              <Check className="w-5 h-5" />
            )}
            {!swipeDirection && (
              <ChevronRight className="w-5 h-5" />
            )}
          </div>
        </div>

        {/* Swipe Hint */}
        {swipeProgress === 0 && (
          <div className="absolute inset-0 flex items-center justify-between px-4 text-white/60 text-xs pointer-events-none">
            <span className="flex items-center gap-1">
              <X className="w-3 h-3" />
              Reject
            </span>
            <span className="flex items-center gap-1">
              Accept
              <Check className="w-3 h-3" />
            </span>
          </div>
        )}
      </div>
    )
  }

  // Order Pickup Button Component (with bill upload)
  const OrderPickupButton = ({ order, onPickup, billImageUrl, isUploading, onCameraClick }) => {
    const [swipeProgress, setSwipeProgress] = useState(0)
    const [isSwiping, setIsSwiping] = useState(false)
    const buttonRef = useRef(null)
    const startXRef = useRef(0)
    const currentXRef = useRef(0)
    const orderId = order.orderId || order._id

    const handleTouchStart = (e) => {
      e.stopPropagation()
      if (!billImageUrl) return
      const touch = e.touches[0]
      startXRef.current = touch.clientX
      currentXRef.current = touch.clientX
      setIsSwiping(true)
      setSwipeProgress(0)
    }

    const handleTouchMove = (e) => {
      e.stopPropagation()
      if (!isSwiping || !billImageUrl) return
      const touch = e.touches[0]
      currentXRef.current = touch.clientX
      const deltaX = currentXRef.current - startXRef.current
      if (deltaX < 0) {
        setSwipeProgress(0)
        return
      }
      const buttonWidth = buttonRef.current?.offsetWidth || 200
      const progress = Math.min(deltaX / buttonWidth, 1)
      setSwipeProgress(progress)
    }

    const handleTouchEnd = (e) => {
      e.stopPropagation()
      if (!isSwiping || !billImageUrl) return
      const deltaX = currentXRef.current - startXRef.current
      const buttonWidth = buttonRef.current?.offsetWidth || 200
      const threshold = buttonWidth * 0.6
      if (deltaX >= threshold) {
        onPickup(order)
      }
      setIsSwiping(false)
      setSwipeProgress(0)
      startXRef.current = 0
      currentXRef.current = 0
    }

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={(e) => onCameraClick(order, e)}
            disabled={isUploading}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              isUploading
                ? 'bg-gray-400 cursor-not-allowed'
                : billImageUrl
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-blue-600 hover:bg-blue-700'
            } text-white font-medium`}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Uploading...</span>
              </>
            ) : billImageUrl ? (
              <>
                <Check className="w-4 h-4" />
                <span>Bill Uploaded</span>
              </>
            ) : (
              <>
                <Camera className="w-4 h-4" />
                <span>Capture Bill</span>
              </>
            )}
          </button>
          <input
            ref={(el) => { fileInputRefs.current[orderId] = el }}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => handleBillImageSelect(order, e)}
            className="hidden"
          />
        </div>
        <div 
          ref={buttonRef}
          className={`relative w-full h-14 rounded-xl overflow-hidden ${
            billImageUrl ? 'bg-green-600' : 'bg-gray-400 cursor-not-allowed'
          }`}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{ touchAction: billImageUrl ? 'pan-y' : 'none' }}
        >
          {swipeProgress > 0 && billImageUrl && (
            <motion.div
              className="absolute inset-0 bg-green-700"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: swipeProgress }}
              transition={{ duration: 0 }}
              style={{ transformOrigin: 'left' }}
            />
          )}
          <div className="relative z-10 h-full flex items-center justify-center px-6">
            <div className="flex items-center gap-3 text-white font-semibold">
              <span className="text-base">
                {!billImageUrl ? 'Upload bill to enable' : swipeProgress > 0.5 ? 'Release to Confirm' : 'Swipe to Confirm Pickup'}
              </span>
              {billImageUrl && swipeProgress > 0.5 && <Check className="w-5 h-5" />}
              {billImageUrl && swipeProgress <= 0.5 && <ChevronRight className="w-5 h-5" />}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Reached Drop Button Component
  const ReachedDropButton = ({ order, onReachedDrop }) => {
    const [swipeProgress, setSwipeProgress] = useState(0)
    const [isSwiping, setIsSwiping] = useState(false)
    const buttonRef = useRef(null)
    const startXRef = useRef(0)
    const currentXRef = useRef(0)

    const handleTouchStart = (e) => {
      e.stopPropagation()
      const touch = e.touches[0]
      startXRef.current = touch.clientX
      currentXRef.current = touch.clientX
      setIsSwiping(true)
      setSwipeProgress(0)
    }

    const handleTouchMove = (e) => {
      e.stopPropagation()
      if (!isSwiping) return
      const touch = e.touches[0]
      currentXRef.current = touch.clientX
      const deltaX = currentXRef.current - startXRef.current
      if (deltaX < 0) {
        setSwipeProgress(0)
        return
      }
      const buttonWidth = buttonRef.current?.offsetWidth || 200
      const progress = Math.min(deltaX / buttonWidth, 1)
      setSwipeProgress(progress)
    }

    const handleTouchEnd = (e) => {
      e.stopPropagation()
      if (!isSwiping) return
      const deltaX = currentXRef.current - startXRef.current
      const buttonWidth = buttonRef.current?.offsetWidth || 200
      const threshold = buttonWidth * 0.6
      if (deltaX >= threshold) {
        onReachedDrop(order)
      }
      setIsSwiping(false)
      setSwipeProgress(0)
      startXRef.current = 0
      currentXRef.current = 0
    }

    return (
      <div 
        ref={buttonRef}
        className="relative w-full h-14 rounded-xl overflow-hidden bg-blue-600"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ touchAction: 'pan-y' }}
      >
        {swipeProgress > 0 && (
          <motion.div
            className="absolute inset-0 bg-blue-700"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: swipeProgress }}
            transition={{ duration: 0 }}
            style={{ transformOrigin: 'left' }}
          />
        )}
        <div className="relative z-10 h-full flex items-center justify-center px-6">
          <div className="flex items-center gap-3 text-white font-semibold">
            <span className="text-base">
              {swipeProgress > 0.5 ? 'Release to Confirm' : 'Swipe to Confirm Reached Drop'}
            </span>
            {swipeProgress > 0.5 && <Check className="w-5 h-5" />}
            {swipeProgress <= 0.5 && <ChevronRight className="w-5 h-5" />}
          </div>
        </div>
      </div>
    )
  }

  // Order Delivered Button Component (with COD info)
  const OrderDeliveredButton = ({ order, onDelivered }) => {
    const [swipeProgress, setSwipeProgress] = useState(0)
    const [isSwiping, setIsSwiping] = useState(false)
    const buttonRef = useRef(null)
    const startXRef = useRef(0)
    const currentXRef = useRef(0)
    
    const paymentMethod = (order.payment?.method || '').toLowerCase()
    const isCOD = paymentMethod === 'cash' || paymentMethod === 'cod'
    const total = order.pricing?.total || 0

    const handleTouchStart = (e) => {
      e.stopPropagation()
      const touch = e.touches[0]
      startXRef.current = touch.clientX
      currentXRef.current = touch.clientX
      setIsSwiping(true)
      setSwipeProgress(0)
    }

    const handleTouchMove = (e) => {
      e.stopPropagation()
      if (!isSwiping) return
      const touch = e.touches[0]
      currentXRef.current = touch.clientX
      const deltaX = currentXRef.current - startXRef.current
      if (deltaX < 0) {
        setSwipeProgress(0)
        return
      }
      const buttonWidth = buttonRef.current?.offsetWidth || 200
      const progress = Math.min(deltaX / buttonWidth, 1)
      setSwipeProgress(progress)
    }

    const handleTouchEnd = (e) => {
      e.stopPropagation()
      if (!isSwiping) return
      const deltaX = currentXRef.current - startXRef.current
      const buttonWidth = buttonRef.current?.offsetWidth || 200
      const threshold = buttonWidth * 0.6
      if (deltaX >= threshold) {
        onDelivered(order)
      }
      setIsSwiping(false)
      setSwipeProgress(0)
      startXRef.current = 0
      currentXRef.current = 0
    }

    return (
      <div className="space-y-3">
        {isCOD && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <IndianRupee className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-medium text-amber-800">Collect from customer (COD)</span>
              </div>
              <span className="text-lg font-bold text-amber-700">
                ₹{total.toFixed(2)}
              </span>
            </div>
          </div>
        )}
        <div 
          ref={buttonRef}
          className="relative w-full h-14 rounded-xl overflow-hidden bg-purple-600"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{ touchAction: 'pan-y' }}
        >
          {swipeProgress > 0 && (
            <motion.div
              className="absolute inset-0 bg-purple-700"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: swipeProgress }}
              transition={{ duration: 0 }}
              style={{ transformOrigin: 'left' }}
            />
          )}
          <div className="relative z-10 h-full flex items-center justify-center px-6">
            <div className="flex items-center gap-3 text-white font-semibold">
              <span className="text-base">
                {swipeProgress > 0.5 ? 'Release to Confirm' : 'Swipe to Confirm Delivered'}
              </span>
              {swipeProgress > 0.5 && <Check className="w-5 h-5" />}
              {swipeProgress <= 0.5 && <ChevronRight className="w-5 h-5" />}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Complete Button Component (with earnings)
  const CompleteButton = ({ order, earnings }) => {
    return (
      <button
        onClick={async () => {
          toast.success(`Order completed! Earnings: ₹${earnings.toFixed(2)}`)
          const fetchResponse = await deliveryAPI.getOrders({ 
            includeDelivered: false, 
            limit: 100 
          })
          if (fetchResponse?.data?.success && fetchResponse?.data?.data?.orders) {
            setOrders(fetchResponse.data.data.orders || [])
          }
        }}
        className="w-full h-14 rounded-xl bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold text-base flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-shadow"
      >
        <CheckCircle2 className="w-5 h-5" />
        <span>Complete - Earnings: ₹{earnings.toFixed(2)}</span>
      </button>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 font-sans">
      {/* Header */}
      <div className="bg-white p-4 flex items-center shadow-sm sticky top-0 z-10">
        <button
          onClick={() => navigate(-1)}
          className="p-1 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-gray-700" />
        </button>
        <h1 className="ml-4 text-xl font-semibold text-gray-800">Orders</h1>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 sticky top-[73px] z-10">
        <div className="flex">
          <button
            onClick={() => setActiveTab("pending")}
            className={`flex-1 py-3 px-4 text-center font-medium transition-colors relative ${
              activeTab === "pending"
                ? "text-orange-600"
                : "text-gray-600"
            }`}
          >
            Pending
            {activeTab === "pending" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-600" />
            )}
            {activeTab === "pending" && filteredOrders.length > 0 && (
              <span className="ml-2 text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">
                {filteredOrders.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("delivered")}
            className={`flex-1 py-3 px-4 text-center font-medium transition-colors relative ${
              activeTab === "delivered"
                ? "text-green-600"
                : "text-gray-600"
            }`}
          >
            Delivered
            {activeTab === "delivered" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-600" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("cancelled")}
            className={`flex-1 py-3 px-4 text-center font-medium transition-colors relative ${
              activeTab === "cancelled"
                ? "text-red-600"
                : "text-gray-600"
            }`}
          >
            Cancelled
            {activeTab === "cancelled" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600" />
            )}
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-4 bg-white">
        <div className="flex items-center bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm">
          <Search className="w-5 h-5 text-orange-500" />
          <input 
            type="text" 
            placeholder="Search by order ID, restaurant or dish" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 ml-3 outline-none text-gray-600 placeholder-gray-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="ml-2 p-1 hover:bg-gray-100 rounded-full"
            >
              <XCircle className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>
      </div>
          
      {/* Orders List */}
      <div className="px-4 py-2">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-orange-500 animate-spin mb-4" />
            <p className="text-gray-600">Loading orders...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Package className="w-16 h-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {searchQuery ? "No orders found" : `No ${activeTab} orders`}
            </h3>
            <p className="text-gray-600 text-sm text-center">
              {searchQuery 
                ? "Try searching with different keywords"
                : activeTab === "pending"
                ? "You don't have any active assigned orders"
                : `You don't have any ${activeTab} orders yet`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              const restaurantName = order.restaurantName || order.restaurantId?.name || 'Restaurant'
              const restaurantLocation = getRestaurantLocation(order)
              const restaurantImage = getRestaurantImage(order)
              const orderDate = formatOrderDate(order.createdAt)
              const orderStatus = getOrderStatus(order)
              const orderPrice = order.pricing?.total || order.total || 0
              const paymentFailed = isPaymentFailed(order)
              const isDelivered = order.status === 'delivered' || order.status === 'completed'
              const isCancelled = order.status === 'cancelled'
              const isActive = isActiveOrder(order)
              const rating = order.rating || order.deliveryState?.rating || null
              const orderId = order.orderId || order._id || 'N/A'

              return (
                <div 
                  key={order._id || order.orderId || Math.random()} 
                  className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
                >
                  {/* Active Order Badge */}
                  {isActive && activeTab === "pending" && (
                    <div className="bg-orange-50 border-b border-orange-200 px-4 py-2">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-orange-600" />
                        <span className="text-xs font-semibold text-orange-600">Active Assigned Order</span>
                      </div>
                    </div>
                  )}

                  {/* Card Header: Restaurant Info */}
                  <div className="flex items-start justify-between p-4 pb-2">
                    <div className="flex gap-3 flex-1">
                      {/* Restaurant/Food Image */}
                      <div className="w-14 h-14 rounded-lg bg-gray-200 overflow-hidden shrink-0">
                        <img 
                          src={restaurantImage} 
                          alt={restaurantName}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.src = "https://images.unsplash.com/photo-1555949258-eb67b1ef0ceb?auto=format&fit=crop&w=100&q=80"
                          }}
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-800 text-lg leading-tight truncate">{restaurantName}</h3>
                          {/* Location Button - Show for pickup phase */}
                          {isActive && activeTab === "pending" && isAcceptedByDeliveryBoy(order) && !isOrderPickedUp(order) && (
                            <button
                              onClick={(e) => handleRestaurantLocationClick(order, e)}
                              className="p-1.5 hover:bg-green-50 rounded-full transition-colors shrink-0"
                              title="View restaurant location on map"
                            >
                              <MapPin className="w-4 h-4 text-green-600" />
                            </button>
                          )}
                          {/* Location Button - Show for drop phase */}
                          {isActive && activeTab === "pending" && isOrderPickedUp(order) && !isReachedDrop(order) && (
                            <button
                              onClick={(e) => handleCustomerLocationClick(order, e)}
                              className="p-1.5 hover:bg-blue-50 rounded-full transition-colors shrink-0"
                              title="View customer location on map"
                            >
                              <MapPin className="w-4 h-4 text-blue-600" />
                            </button>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">{restaurantLocation}</p>
                        <p className="text-xs text-gray-400 mt-1">Order ID: {orderId}</p>
                      </div>
                    </div>

                    <button 
                      className="p-1 hover:bg-gray-100 rounded-full shrink-0"
                      onClick={(e) => {
                        e.stopPropagation()
                      }}
                    >
                      <MoreVertical className="w-5 h-5 text-gray-400" />
                    </button>
                  </div>

                  {/* Separator */}
                  <div className="border-t border-dashed border-gray-200 mx-4 my-1"></div>

                  {/* Items List */}
                  <div className="px-4 py-2">
                    {order.items && order.items.length > 0 ? (
                      order.items.slice(0, 3).map((item, idx) => (
                        <div key={item._id || item.itemId || idx} className="flex items-center gap-2 mt-1">
                          <div className={`w-4 h-4 border ${item.isVeg ? 'border-green-600' : 'border-red-600'} flex items-center justify-center p-[2px] shrink-0`}>
                            <div className={`w-full h-full rounded-full ${item.isVeg ? 'bg-green-600' : 'bg-red-600'}`}></div>
                          </div>
                          <span className="text-sm text-gray-700 font-medium">
                            {item.quantity || 1} x {item.name}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">No items listed</p>
                    )}
                    {order.items && order.items.length > 3 && (
                      <p className="text-xs text-gray-400 mt-1">+{order.items.length - 3} more items</p>
                    )}
                  </div>

                  {/* Date and Price */}
                  <div className="px-4 py-2 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-400">Order placed on {orderDate}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs font-medium ${
                          isDelivered ? 'text-green-600' :
                          isCancelled ? 'text-red-600' :
                          'text-orange-600'
                        }`}>
                          {orderStatus}
                        </span>
                        {isActive && activeTab === "pending" && (
                          <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">
                            Active
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center">
                      <span className="text-sm font-semibold text-gray-800">₹{orderPrice.toFixed(2)}</span>
                      <ChevronRight className="w-4 h-4 text-gray-400 ml-1" />
                    </div>
                  </div>

                  {/* Separator */}
                  <div className="border-t border-gray-100 mx-4"></div>

                  {/* Card Footer: Actions */}
                  <div className="px-4 py-3">
                    {/* Swipeable Action Button - Only for active pending orders */}
                    {isActive && activeTab === "pending" ? (
                      // Phase 1: Order not accepted yet - show Accept/Reject button
                      !isAcceptedByDeliveryBoy(order) ? (
                        <SwipeableActionButton
                          order={order}
                          onAccept={handleAcceptOrder}
                          onReject={handleRejectOrder}
                        />
                      ) : // Phase 2: Accepted but not reached pickup - show Reached Pickup button
                      !isReachedPickup(order) ? (
                        <SwipeableReachedPickupButton
                          order={order}
                          onReachedPickup={handleReachedPickup}
                        />
                      ) : // Phase 3: Reached pickup but not picked up - show Order Pickup with bill upload
                      !isOrderPickedUp(order) ? (
                        <OrderPickupButton
                          order={order}
                          onPickup={handleOrderPickup}
                          billImageUrl={billImages[order.orderId || order._id]}
                          isUploading={uploadingBills[order.orderId || order._id]}
                          onCameraClick={handleBillImageCapture}
                        />
                      ) : // Phase 4: Picked up but not reached drop - show Reached Drop button
                      !isReachedDrop(order) ? (
                        <ReachedDropButton
                          order={order}
                          onReachedDrop={handleReachedDrop}
                        />
                      ) : // Phase 5: Reached drop but not delivered - show Order Delivered with COD
                      !isOrderDelivered(order) ? (
                        <OrderDeliveredButton
                          order={order}
                          onDelivered={handleOrderDelivered}
                        />
                      ) : // Phase 6: Delivered - show Complete button with earnings
                      (
                        <CompleteButton
                          order={order}
                          earnings={order.pricing?.deliveryFee || order.estimatedEarnings || 0}
                        />
                      )
                    ) : paymentFailed ? (
                      <div className="flex items-center gap-2">
                        <div className="bg-red-100 p-1 rounded-full">
                          <AlertCircle className="w-4 h-4 text-red-500" />
                        </div>
                        <span className="text-xs font-semibold text-red-500">Payment failed</span>
                      </div>
                    ) : isDelivered && rating ? (
                      <div>
                        <div className="flex items-center gap-1">
                          <span className="text-sm text-gray-800">You rated</span>
                          <div className="flex bg-yellow-400 text-white px-1 rounded text-[10px] items-center gap-0.5 h-4">
                            {rating}<Star className="w-2 h-2 fill-current" />
                          </div>
                        </div>
                      </div>
                    ) : !isCancelled ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          if (order.restaurantId) {
                            navigate(`/restaurant/${order.restaurantId?.slug || order.restaurantId?._id || order.restaurantId}`)
                          }
                        }}
                        className="w-full bg-[#E23744] hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1 shadow-sm transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Reorder
                      </button>
                    ) : (
                      <div>
                        <span className="text-sm text-gray-800">{orderStatus}</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
